import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error handling for deleting a post with invalid or non-existent
 * threadId/postId.
 *
 * This test verifies that attempting to delete a post using either a
 * non-existent threadId, a non-existent postId, or both, is handled gracefully
 * by the API. It ensures the endpoint does not succeed, returns an error, and
 * does not affect existing records. No authentication or prerequisite data
 * creation is required due to the scenario focusing solely on negative case
 * error handling.
 *
 * Steps:
 *
 * 1. Attempt to delete a post where both threadId and postId are random (highly
 *    likely non-existent)
 * 2. Attempt to delete with random threadId and fixed postId (simulate
 *    non-existent thread)
 * 3. Attempt to delete with fixed threadId and random postId (simulate
 *    non-existent post)
 * 4. For all, expect an error to be thrown (e.g., not found or forbidden)
 */
export async function test_api_discussionBoard_test_soft_delete_post_with_invalid_thread_or_post_id(
  connection: api.IConnection,
) {
  // 1. Attempt to delete with both IDs random (simulate totally non-existent resources)
  await TestValidator.error("totally random threadId/postId should throw")(() =>
    api.functional.discussionBoard.member.threads.posts.erase(connection, {
      threadId: typia.random<string & tags.Format<"uuid">>(),
      postId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 2. Attempt to delete with a random threadId but fixed postId (simulate only thread is non-existent)
  const fixedPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("random threadId should throw")(() =>
    api.functional.discussionBoard.member.threads.posts.erase(connection, {
      threadId: typia.random<string & tags.Format<"uuid">>(),
      postId: fixedPostId,
    }),
  );

  // 3. Attempt to delete with a fixed threadId but random postId (simulate only post is non-existent)
  const fixedThreadId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("random postId should throw")(() =>
    api.functional.discussionBoard.member.threads.posts.erase(connection, {
      threadId: fixedThreadId,
      postId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );
}
