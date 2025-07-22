import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate error handling when assigning moderator role to a non-existent member.
 *
 * This test ensures that the API correctly rejects attempts to assign moderator
 * privileges to a member ID that is not present in the discussion board system.
 * The API should return an error response, not a successful moderator assignment.
 *
 * Steps:
 * 1. Create a random UUID that does not correspond to any existing member.
 * 2. Attempt to call the moderator assignment API with this invalid member_id.
 * 3. Confirm that the API returns an error and does NOT create a moderator record.
 * 4. Ensure the error is handled gracefully (proper HTTP error thrown, not a crash).
 */
export async function test_api_discussionBoard_test_assign_moderator_to_invalid_member_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that is extremely unlikely to exist as a member
  const invalidMemberId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Try to assign moderator role to this invalid member ID
  await TestValidator.error("Assigning moderator to non-existent member should fail")(
    async () => {
      await api.functional.discussionBoard.moderators.post(connection, {
        body: {
          member_id: invalidMemberId,
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );
}