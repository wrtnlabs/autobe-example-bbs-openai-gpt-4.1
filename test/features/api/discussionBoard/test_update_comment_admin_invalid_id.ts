import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validates error handling for updating a discussion board comment with an
 * invalid or non-existent commentId as an admin.
 *
 * This test ensures the API robustly rejects attempts to edit comments that do
 * not exist, by expecting a 404 error (or similar) when an invalid UUID is
 * used.
 *
 * Steps:
 *
 * 1. Generate a random UUID that does not correspond to any existing comment.
 * 2. Attempt to update a comment as an admin with this non-existent commentId,
 *    using a valid update request body.
 * 3. Verify that the API call results in a 404 (not found) or equivalent error
 *    indicating the comment does not exist.
 * 4. Confirm no comment resource is mistakenly updated or created.
 */
export async function test_api_discussionBoard_test_update_comment_admin_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate a random (non-existent) commentId
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare a valid update body
  const updateBody: IDiscussionBoardComment.IUpdate = {
    content: "Updated content for a non-existent comment.",
    is_deleted: false,
  };

  // 3. Attempt to update and expect a 404 error
  await TestValidator.error("updating non-existent comment must fail")(() =>
    api.functional.discussionBoard.admin.comments.update(connection, {
      commentId: invalidCommentId,
      body: updateBody,
    }),
  );

  // 4. If error thrown as expected, test passes (no update occurs)
}
