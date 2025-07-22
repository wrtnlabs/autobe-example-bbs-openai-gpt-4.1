import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test unauthorized comment update by non-author user.
 *
 * This test validates that a user cannot update another user's comment. The process:
 *
 * 1. Create user A (the author, memberAId)
 * 2. User A creates a thread
 * 3. User A creates a post in that thread
 * 4. User A creates a comment
 * 5. (Simulate / Assume) a separate user B (memberBId)
 * 6. User B attempts to update user A's comment
 * 7. The update must fail with an authorization error: forbidden / permission denied
 *
 * Assumptions:
 * - Since no explicit authentication/membership API is provided, member IDs are simulated via random uuid generation for comment and post creation.
 * - The test structure assumes the system enforces author-only updates internally.
 */
export async function test_api_discussionBoard_test_update_comment_by_non_author_returns_forbidden(
  connection: api.IConnection,
) {
  // 1. Simulate User A's identity
  const memberAId = typia.random<string & tags.Format<"uuid">>();
  // 2. User A creates a thread
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: memberAId,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: "Test Thread for Unauthorized Update",
      body: "Thread created to test update permission restriction.",
    },
  });
  typia.assert(thread);

  // 3. User A creates a post
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: memberAId,
      body: "Initial post for update forbidden test.",
    },
  });
  typia.assert(post);

  // 4. User A creates a comment
  const comment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      body: "Original comment by user A.",
    },
  });
  typia.assert(comment);

  // 5. Simulate User B (a different member)
  const memberBId = typia.random<string & tags.Format<"uuid">>();

  // 6. User B attempts to update A's comment
  await TestValidator.error("Non-author should be forbidden from updating comment")(
    async () => {
      await api.functional.discussionBoard.comments.putById(connection, {
        id: comment.id,
        body: {
          body: "Malicious edit attempt by user B.",
        },
      });
    }
  );
}