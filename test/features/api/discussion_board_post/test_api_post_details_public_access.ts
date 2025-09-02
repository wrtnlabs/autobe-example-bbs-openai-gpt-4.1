import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate that public (unauthenticated/guest) access retrieves post
 * details by threadId and postId.
 *
 * Also verifies error is returned for missing or soft-deleted posts.
 *
 * 1. Simulate an active post (with deleted_at null/missing) and fetch details,
 *    expect success.
 * 2. Simulate a soft-deleted post or non-existent post, expect not-found
 *    error.
 * 3. Confirm response type matches IDiscussionBoardPost contract.
 * 4. No authentication required.
 */
export async function test_api_post_details_public_access(
  connection: api.IConnection,
) {
  // 1. Prepare a simulated active (not deleted) post
  const activePost: IDiscussionBoardPost = typia.random<IDiscussionBoardPost>();
  activePost.deleted_at = null; // Ensure post is not soft-deleted

  // Retrieve the post details as public/guest (no authentication needed)
  const output = await api.functional.discussionBoard.threads.posts.at(
    connection,
    {
      threadId: activePost.thread_id,
      postId: activePost.id,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "retrieved post matches requested post id",
    output.id,
    activePost.id,
  );
  TestValidator.predicate(
    "post is not soft-deleted",
    output.deleted_at === null || output.deleted_at === undefined,
  );

  // 2. Attempt to access a soft-deleted post (should fail with not-found)
  const deletedPost: IDiscussionBoardPost =
    typia.random<IDiscussionBoardPost>();
  deletedPost.deleted_at = new Date().toISOString();
  await TestValidator.error(
    "soft-deleted post should not be accessible",
    async () => {
      await api.functional.discussionBoard.threads.posts.at(connection, {
        threadId: deletedPost.thread_id,
        postId: deletedPost.id,
      });
    },
  );

  // 3. Attempt to access a non-existent post (should fail with not-found)
  await TestValidator.error(
    "non-existent post should not be accessible",
    async () => {
      await api.functional.discussionBoard.threads.posts.at(connection, {
        threadId: typia.random<string & tags.Format<"uuid">>(),
        postId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
