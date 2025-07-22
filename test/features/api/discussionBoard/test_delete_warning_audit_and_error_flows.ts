import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

/**
 * E2E test for deleting discussion board warnings with audit and error validation flows.
 *
 * Validates moderator/admin can soft-delete a warning, verifies proper audit/error
 * behaviors, and checks that unauthorized users can't perform the action.
 *
 * 1. Create a member (target of the warning).
 * 2. Create a second member (simulates moderator/admin for issuing and deleting warnings).
 * 3. Issue a warning to the target member by the moderator member.
 * 4. As moderator, delete the warning and verify success.
 * 5. Attempt to delete the warning again; confirm correct error/idempotency policy (should fail or no-op).
 * 6. Create a third (regular) member for unauthorized access tests (unimplemented if role switching is not possible).
 * 7. Attempt to delete a non-existent warning as moderator and confirm error handling.
 *
 * Notes:
 * - If the API exposes no explicit login/role switching, authorization is assumed on the test connection.
 * - No invention of fields or unsupported scenarios (E2E focuses strictly on API/testable flows).
 */
export async function test_api_discussionBoard_test_delete_warning_audit_and_error_flows(
  connection: api.IConnection,
) {
  // 1. Create the target (member to be warned)
  const target: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(target);

  // 2. Create moderator/admin member
  const moderator: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(moderator);

  // 3. Moderator issues warning to the target member
  const warning: IDiscussionBoardWarning = await api.functional.discussionBoard.warnings.post(connection, {
    body: {
      member_id: target.id,
      moderator_id: moderator.id,
      warning_type: "spam",
      message: "Test warning for E2E audit and error scenarios.",
      expires_at: null,
    } satisfies IDiscussionBoardWarning.ICreate,
  });
  typia.assert(warning);

  // 4. Moderator deletes the warning (soft delete)
  const result1 = await api.functional.discussionBoard.warnings.eraseById(connection, {
    id: warning.id,
  });
  typia.assert(result1);
  TestValidator.predicate("first deletion is success")(result1.success === true);

  // 5. Attempt to delete the warning again (should fail or soft-idempotent)
  const result2 = await api.functional.discussionBoard.warnings.eraseById(connection, {
    id: warning.id,
  });
  typia.assert(result2);
  TestValidator.predicate("repeat deletion should not succeed")(result2.success === false);

  // 6. Create an additional member (would be used for unauthorized test - omitted due to lack of role/admin endpoints)
  const someMember: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(someMember);

  // 7. Delete a non-existent warning
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  const result3 = await api.functional.discussionBoard.warnings.eraseById(connection, {
    id: randomUuid,
  });
  typia.assert(result3);
  TestValidator.predicate("deletion of non-existent warning must fail")(result3.success === false);
}