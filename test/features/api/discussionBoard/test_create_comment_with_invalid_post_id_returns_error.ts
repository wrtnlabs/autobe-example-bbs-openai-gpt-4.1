import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate that attempting to create a comment on a non-existent discussion board post returns an error.
 *
 * This test ensures the API enforces referential integrity when clients attempt to add comments to discussion board posts. It does this by attempting to create a comment using a random (but valid-format) UUID for the `discussion_board_post_id` field that does not correspond to any existing post. The test passes if the API returns an error indicating that the target post does not exist or is invalid.
 *
 * Steps:
 * 1. Generate a valid random UUID for `discussion_board_post_id` that does not correspond to any real post.
 * 2. Attempt to create a discussion board comment using this UUID.
 * 3. Confirm the API call fails by asserting that an error is thrown.
 * 4. (Optional) Validate that the error is due to invalid or non-existent post.
 */
export async function test_api_discussionBoard_test_create_comment_with_invalid_post_id_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for the non-existent discussion board post ID
  const invalidPostId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to create a comment referring to the invalid post, expecting an error
  await TestValidator.error("comment creation with invalid post id should fail")(
    () =>
      api.functional.discussionBoard.comments.post(connection, {
        body: {
          discussion_board_post_id: invalidPostId,
          body: "This comment should not be created.",
          // parent_id omitted (root comment)
        } satisfies IDiscussionBoardComment.ICreate,
      }),
  );
}