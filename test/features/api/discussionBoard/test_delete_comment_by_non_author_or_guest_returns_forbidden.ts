import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate that deletion of a comment by a non-author or a guest is forbidden.
 *
 * This test ensures that only the author of a comment (or an authorized moderator/admin) can delete the comment.
 * The workflow will create a thread, then a post in the thread, then a comment on that post (all by one authenticated user – User A).
 * It will then attempt to delete the comment via:
 *  1. An authenticated, non-author member (User B) – this should be forbidden and result in an error
 *  2. No authentication at all (guest) – this should also be forbidden and result in an error
 * In both negative cases, it should verify that the comment still exists (was not deleted).
 *
 * Steps:
 * 1. User A creates a thread
 * 2. User A creates a post in the thread
 * 3. User A creates a comment on the post
 * 4. User B (different user) tries to delete the comment (expect forbidden/error)
 * 5. Guest (no authentication) tries to delete the comment (expect forbidden/error)
 */
export async function test_api_discussionBoard_test_delete_comment_by_non_author_or_guest_returns_forbidden(
  connection: api.IConnection,
) {
  // Step 1: User A creates a thread
  // ASSUMPTION: connection is authenticated as User A
  const userAId = typia.random<string & tags.Format<"uuid">>();
  const userACategoryId = typia.random<string & tags.Format<"uuid">>();
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: userAId,
      discussion_board_category_id: userACategoryId,
      title: RandomGenerator.paragraph()(10),
      body: RandomGenerator.content()(2)(5),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // Step 2: User A creates a post in the thread
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: userAId,
      body: RandomGenerator.paragraph()(10),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // Step 3: User A creates a comment on the post
  const comment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      body: RandomGenerator.paragraph()(5),
    } satisfies IDiscussionBoardComment.ICreate,
  });
  typia.assert(comment);

  // Step 4: Switch to User B and attempt unauthorized deletion
  // (Simulate by making new connection or swapping authentication context if possible)
  const userBConnection = { ...connection } as api.IConnection;
  userBConnection.headers = { ...userBConnection.headers, Authorization: `Bearer ${typia.random<string>()}` };
  // If user id selection is needed, generate new for user B
  // Attempt to delete comment as User B
  await TestValidator.error("deletion by non-author should fail")(async () => {
    await api.functional.discussionBoard.comments.eraseById(userBConnection, { id: comment.id });
  });

  // Step 5: Attempt deletion as guest/unauthenticated (no Authorization header)
  const guestConnection = { ...connection } as api.IConnection;
  guestConnection.headers = { ...guestConnection.headers };
  delete guestConnection.headers["Authorization"];
  await TestValidator.error("deletion by guest should fail")(async () => {
    await api.functional.discussionBoard.comments.eraseById(guestConnection, { id: comment.id });
  });

  // Optional: Verify the comment still exists by fetching or similar, if API supports
  // (Not possible here as there's no GET for comments)
}