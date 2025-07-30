import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate error handling for fetching a non-existent or deleted comment as a
 * member.
 *
 * This test ensures that the API correctly returns a 404 error (or appropriate
 * error response) when an attempt is made to fetch a comment using a commentId
 * that does not exist or has been deleted. This is vital for robust error
 * handling and helps prevent exposing invalid or deleted data to end users. The
 * correctness of error handling is foundational for client reliability and user
 * experience.
 *
 * Test Process:
 *
 * 1. As a member, call the API to fetch a comment by a randomly generated
 *    (non-existent) UUID as the commentId.
 * 2. Confirm that a 404 error is thrown (or another error indicating 'not found').
 * 3. Optionally, validate that the error object is in the expected error format.
 */
export async function test_api_discussionBoard_member_comments_at_comment_not_found(
  connection: api.IConnection,
) {
  // 1. Attempt to retrieve a comment with a random non-existent commentId.
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Should return 404 or not found for missing comment",
  )(async () => {
    await api.functional.discussionBoard.member.comments.at(connection, {
      commentId: nonExistentCommentId,
    });
  });
}
