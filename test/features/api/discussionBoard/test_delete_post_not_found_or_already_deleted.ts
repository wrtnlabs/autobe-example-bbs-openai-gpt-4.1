import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test error handling for deleting non-existent and already soft-deleted posts.
 *
 * This test covers two negative scenarios for the DELETE post endpoint:
 *   1. Attempting to delete a post by a random, non-existent UUID (should return not-found error).
 *   2. Deleting a post, then immediately attempting to delete it again (should return already-deleted error).
 *
 * Steps:
 * 1. Register a discussion board member (to act as the post/thread author).
 * 2. Create a thread associated with the member.
 * 3. Create a post in the thread by this member.
 * 4. Try deleting a post by a random UUID (should fail: not found).
 * 5. Delete the created post (should succeed).
 * 6. Try deleting it again (should fail: already deleted).
 *
 * These assertions confirm proper error propagation for non-existent and already-deleted post deletion attempts.
 */
export async function test_api_discussionBoard_test_delete_post_not_found_or_already_deleted(
  connection: api.IConnection,
) {
  // 1. Register member
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a thread
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: member.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(32),
      body: RandomGenerator.content()()(128),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 3. Create a post in the thread
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: member.id,
      body: RandomGenerator.content()()(64),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 4. Negative case: Try deleting a post by a random, non-existent UUID
  await TestValidator.error("eraseById not-found")(() =>
    api.functional.discussionBoard.posts.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 5. Successfully delete the created post
  const erased = await api.functional.discussionBoard.posts.eraseById(connection, {
    id: post.id,
  });
  typia.assert(erased);

  // 6. Negative case: Try deleting the same post again
  await TestValidator.error("eraseById already-deleted")(() =>
    api.functional.discussionBoard.posts.eraseById(connection, {
      id: post.id,
    }),
  );
}