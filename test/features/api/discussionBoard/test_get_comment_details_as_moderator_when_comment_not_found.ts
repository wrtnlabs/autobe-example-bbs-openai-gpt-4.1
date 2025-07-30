import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate error handling when a moderator attempts to fetch a nonexistent or
 * deleted comment by commentId.
 *
 * This test ensures that the API correctly returns a 404 or appropriate error
 * when attempting to retrieve the details of a discussion board comment which
 * does not exist. Such negative cases are crucial for verifying robust error
 * feedback and preventing information disclosure or unexpected behavior on
 * missing records.
 *
 * Steps:
 *
 * 1. Generate a random UUID which is presumed to NOT exist (ensuring it's not
 *    present in the database).
 * 2. Attempt to fetch the comment details as a moderator using the GET
 *    /discussionBoard/moderator/comments/{commentId} endpoint.
 * 3. Validate that the API throws an error (such as 404 Not Found).
 * 4. Ensure error is of correct type and not a successful data response.
 */
export async function test_api_discussionBoard_moderator_comments_at_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID unlikely to exist
  const nonExistingCommentId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to fetch the comment details and expect error
  await TestValidator.error("should throw 404 or not found error")(async () => {
    await api.functional.discussionBoard.moderator.comments.at(connection, {
      commentId: nonExistingCommentId,
    });
  });
}
