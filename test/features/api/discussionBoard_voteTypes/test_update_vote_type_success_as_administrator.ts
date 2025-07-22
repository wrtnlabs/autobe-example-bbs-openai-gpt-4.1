import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";

/**
 * Validate successful update of a vote type by an administrator.
 *
 * This test ensures that an administrator can update a vote type's name, description, and code fields, and that all business rules are maintained:
 * - Uniqueness is preserved (code should not conflict with others)
 * - The vote type is pre-created for a valid update scenario
 * - The response includes all relevant updated fields and proper audit timestamps
 *
 * Steps:
 * 1. Create a new vote type via POST (acting as system admin) to obtain an initial ID and baseline data.
 * 2. Prepare an update with changed name, description, and code (new unique values).
 * 3. Send PUT to /discussionBoard/voteTypes/{id} with updated data.
 * 4. Verify the returned object reflects changes and audit fields updated (created_at should persist, updated_at should change).
 * 5. Confirm old and new values differ appropriately.
 */
export async function test_api_discussionBoard_voteTypes_test_update_vote_type_success_as_administrator(
  connection: api.IConnection,
) {
  // 1. Create a vote type (dependency)
  const originalCode = `test_code_${RandomGenerator.alphaNumeric(8)}`;
  const originalName = `Initial Name ${RandomGenerator.alphabets(3)}`;
  const originalDescription = `Initial description ${RandomGenerator.paragraph()(5)}`;
  const created = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: originalCode,
      name: originalName,
      description: originalDescription,
    } satisfies IDiscussionBoardVoteType.ICreate,
  });
  typia.assert(created);

  // 2. Prepare new update information (unique, non-conflicting)
  const updatedCode = `updated_code_${RandomGenerator.alphaNumeric(8)}`;
  const updatedName = `Updated Name ${RandomGenerator.alphabets(3)}`;
  const updatedDescription = `Updated for test: ${RandomGenerator.paragraph()(5)}`;

  // 3. Update the vote type
  const updated = await api.functional.discussionBoard.voteTypes.putById(connection, {
    id: created.id,
    body: {
      code: updatedCode,
      name: updatedName,
      description: updatedDescription,
    } satisfies IDiscussionBoardVoteType.IUpdate,
  });
  typia.assert(updated);

  // 4. Verify updated fields and audit attributes
  TestValidator.equals("id matches")(updated.id)(created.id);
  TestValidator.notEquals("code has changed")(updated.code)(created.code);
  TestValidator.equals("code matches update")(updated.code)(updatedCode);
  TestValidator.notEquals("name has changed")(updated.name)(created.name);
  TestValidator.equals("name matches update")(updated.name)(updatedName);
  TestValidator.notEquals("description has changed")(updated.description)(created.description);
  TestValidator.equals("description matches update")(updated.description)(updatedDescription);
  // created_at must remain the same, updated_at should differ
  TestValidator.equals("created_at persists")(updated.created_at)(created.created_at);
  TestValidator.notEquals("updated_at changed")(updated.updated_at)(created.updated_at);
}