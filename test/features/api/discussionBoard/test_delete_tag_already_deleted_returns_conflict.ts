import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate that deleting a tag that is already soft-deleted responds
 * appropriately (e.g., conflict or idempotent error), confirming
 * correctness and idempotency of the soft-delete logic for tags.
 *
 * ## Business context:
 * Moderators or administrators may attempt to delete the same tag
 * multiple times either accidentally or due to frontend race conditions.
 * This test ensures that double-delete attempts on the same tag respond
 * with an error (e.g., conflict or not-modified), not allowing multiple
 * soft deletions or ignoring business logic. Ensures system auditability
 * and correct idempotent error handling as expected for soft-delete APIs.
 *
 * ## Steps:
 * 1. Create a new tag with random name and optional description.
 * 2. Delete the tag for the first time (soft delete; expect 'deleted_at' to be non-null).
 * 3. Try deleting the same tag again; expect an error (conflict or similar), confirming idempotency enforcement.
 */
export async function test_api_discussionBoard_test_delete_tag_already_deleted_returns_conflict(
  connection: api.IConnection,
) {
  // 1. Create a new tag
  const tagInput: IDiscussionBoardTag.ICreate = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph()(),
  };
  const tag = await api.functional.discussionBoard.tags.post(connection, { body: tagInput });
  typia.assert(tag);
  TestValidator.equals("created tag name")(tag.name)(tagInput.name);

  // 2. Delete the tag for the first time (soft-delete)
  const deletedTag = await api.functional.discussionBoard.tags.eraseById(connection, { id: tag.id });
  typia.assert(deletedTag);
  TestValidator.predicate("deleted_at is set")(!!deletedTag.deleted_at);
  TestValidator.equals("deleted tag id")(deletedTag.id)(tag.id);

  // 3. Attempt to delete the same tag again; expect an error (conflict or not-modified)
  await TestValidator.error("repeat-delete should result in error")(async () => {
    await api.functional.discussionBoard.tags.eraseById(connection, { id: tag.id });
  });
}