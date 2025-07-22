import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate that updating a non-existent or deleted comment returns a 404 error.
 *
 * This test ensures that when a client attempts to update a comment using a UUID that does not correspond to any existing or active comment (i.e., comment is either deleted or never existed), the API correctly returns a not found error.
 *
 * Steps:
 * 1. Generate a random UUID that is highly unlikely to correspond to any actual comment.
 * 2. Prepare a valid IDiscussionBoardComment.IUpdate payload (required for the PUT request).
 * 3. Attempt to update the non-existent comment using the SDK function.
 * 4. Assert that the API throws, indicating not found (404).
 */
export async function test_api_discussionBoard_test_update_nonexistent_comment_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID presumed to not exist in the database
  const nonexistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare valid update payload as required by API
  const updatePayload: IDiscussionBoardComment.IUpdate = {
    body: "This should fail because the comment does not exist.",
    is_edited: true,
  };

  // 3. Try the update and assert error is thrown (404 not found or business error)
  await TestValidator.error("Should fail with not found for nonexistent comment")(
    async () => {
      await api.functional.discussionBoard.comments.putById(connection, {
        id: nonexistentCommentId,
        body: updatePayload,
      });
    }
  );
}