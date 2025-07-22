import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test soft-deleting a tag by its ID in the discussion board system.
 *
 * This E2E test covers the workflow of creating a tag, performing a soft-delete on that tag, and validating that the deleted tag is invisible from normal retrieval post-deletion. It verifies correct soft-delete logic: after a tag is deleted, it cannot be accessed through normal API calls and is effectively hidden for standard queries, confirming the tag's soft deletion rather than hard removal from the database.
 *
 * Process:
 * 1. Create a tag using the POST /discussionBoard/tags endpoint.
 * 2. Delete the created tag through DELETE /discussionBoard/tags/{id} endpoint (soft delete logic applies).
 * 3. Validate that the tag's deleted_at field is set, indicating a successful soft delete.
 * 4. (If tag-get/list existed, we'd attempt retrieval and expect invisibility, but API does not provide this, so step omitted.)
 */
export async function test_api_discussionBoard_test_delete_tag_by_id_with_success(
  connection: api.IConnection,
) {
  // 1. Create a tag to be deleted
  const createInput: IDiscussionBoardTag.ICreate = {
    name: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph()(),
  };
  const createdTag: IDiscussionBoardTag = await api.functional.discussionBoard.tags.post(connection, {
    body: createInput,
  });
  typia.assert(createdTag);

  // 2. Soft-delete the tag by its ID
  const deletedTag: IDiscussionBoardTag = await api.functional.discussionBoard.tags.eraseById(connection, {
    id: createdTag.id,
  });
  typia.assert(deletedTag);

  // 3. Verify the tag's deleted_at field is now set (soft delete indicator)
  TestValidator.predicate("deleted_at should be set after soft delete")(!!deletedTag.deleted_at && typeof deletedTag.deleted_at === "string");

  // 4. (No get/list endpoint available for post-delete invisibility validation)
}