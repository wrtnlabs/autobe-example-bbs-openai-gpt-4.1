import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

/**
 * Test retrieving details for a specific user warning by its UUID under various cases.
 *
 * Validates normal usage (find by valid ID), negative scenario (lookup by nonexistent/invalid UUID),
 * and documents limitations of soft-delete and role-based access test coverage due to missing API controls.
 *
 * Steps:
 * 1. Register a standard member (who will later receive the warning).
 * 2. Register a moderator (who will issue the warning).
 * 3. The moderator issues a warning to the member; capture the warning ID.
 * 4. Retrieve and validate warning details by this ID.
 * 5. Attempt to retrieve using a random/nonexistent UUID and assert error handling.
 * 6. (Soft-delete / unauthorized tests not implemented due to missing APIs or role context.)
 */
export async function test_api_discussionBoard_test_get_specific_warning_by_id_with_valid_and_invalid_cases(
  connection: api.IConnection,
) {
  // 1. Create the standard member who will receive the warning
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a moderator (who issues the warning)
  const moderator = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(moderator);

  // 3. Moderator issues a warning to the member
  const warningInput = {
    member_id: member.id,
    moderator_id: moderator.id,
    warning_type: "spam",
    message: "You have violated the forum rules.",
    expires_at: null,
  } satisfies IDiscussionBoardWarning.ICreate;

  const warning = await api.functional.discussionBoard.warnings.post(connection, {
    body: warningInput,
  });
  typia.assert(warning);

  // 4. Retrieve warning by its valid ID and check details
  const detail = await api.functional.discussionBoard.warnings.getById(connection, {
    id: warning.id,
  });
  typia.assert(detail);
  TestValidator.equals("warning member matches")(detail.member_id)(member.id);
  TestValidator.equals("warning moderator matches")(detail.moderator_id)(moderator.id);
  TestValidator.equals("warning type matches")(detail.warning_type)(warningInput.warning_type);
  TestValidator.equals("warning message matches")(detail.message)(warningInput.message);

  // 5. Attempt to fetch warning with random, nonexistent UUID (should error)
  await TestValidator.error("not found for random warning UUID")(() =>
    api.functional.discussionBoard.warnings.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 6. Soft-delete/role-based/unauthorized access: Not implemented due to lack of API or role-control
}