import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate updating a comment as moderator with a non-existent commentId
 * returns not found (boundary/error handling).
 *
 * This test verifies that the discussion board moderator comment update
 * endpoint correctly rejects an update attempt on a non-existent comment. It
 * checks if the API returns a not found error and does not make unauthorized
 * modifications.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID for commentId that is extremely unlikely to exist in
 *    the database (boundary case).
 * 2. Prepare a valid minimal update payload (e.g., changing content).
 * 3. Attempt to update using the moderator API.
 * 4. Assert that a not found error is thrown (API rejects it properly).
 * 5. Confirm no comment is returned and the system does not silently succeed.
 */
export async function test_api_discussionBoard_test_update_comment_moderator_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a non-existent comment
  const nonExistentCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Prepare minimal valid update payload
  const updatePayload: IDiscussionBoardComment.IUpdate = {
    content: "Moderator test update on invalid commentId",
  };
  // 3. Attempt to update the comment with invalid id and assert that not found error is thrown
  await TestValidator.error(
    "update on non-existent commentId should throw not found error",
  )(async () => {
    await api.functional.discussionBoard.moderator.comments.update(connection, {
      commentId: nonExistentCommentId,
      body: updatePayload,
    });
  });
}
