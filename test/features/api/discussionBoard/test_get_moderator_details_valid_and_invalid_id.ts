import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Tests retrieving details of a moderator assignment by ID on the discussion board.
 *
 * - Validates successful retrieval of moderator assignment details when the requester is an admin or moderator, covering all key audit fields (assigned_at, revoked_at, related member info, status).
 * - Verifies API returns not found error for non-existent moderator assignments.
 * - Validates that unauthorized users (non-admin/moderator roles) cannot access moderator assignment details and are correctly denied (limitation: only privileged access is testable with the available API set).
 *
 * Test steps:
 * 1. Create a new member and assign moderator role for them as dependencies.
 * 2. Retrieve the moderator assignment details by moderator ID – assert all audit fields are present and correct.
 * 3. Attempt to retrieve a moderator assignment by a random non-existent UUID – expect 404 or appropriate error.
 *
 *   (Further negative/authorization cases are omitted due to unavailable APIs for role switching or deletion.)
 */
export async function test_api_discussionBoard_test_get_moderator_details_valid_and_invalid_id(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Assign this member as moderator
  const moderator = await api.functional.discussionBoard.moderators.post(connection, {
    body: {
      member_id: member.id,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 3. Retrieve moderator assignment details by ID (validate audit fields)
  const output = await api.functional.discussionBoard.moderators.getById(connection, {
    id: moderator.id,
  });
  typia.assert(output);
  TestValidator.equals("moderator id matches")(output.id)(moderator.id);
  TestValidator.equals("member_id matches")(output.member_id)(member.id);
  TestValidator.predicate("assigned_at is valid ISO8601")(
    !isNaN(Date.parse(output.assigned_at))
  );
  TestValidator.equals("revoked_at is null or ISO8601")(
    output.revoked_at === null ||
      output.revoked_at === undefined ||
      !isNaN(Date.parse(output.revoked_at as string))
  )(true);
  TestValidator.equals("member subobject present and matches")(
    !!output.member && output.member.id === member.id
  )(true);

  // 4. Attempt to retrieve a non-existent moderator assignment
  await TestValidator.error("should 404 for non-existent moderator id")(
    async () => {
      await api.functional.discussionBoard.moderators.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}