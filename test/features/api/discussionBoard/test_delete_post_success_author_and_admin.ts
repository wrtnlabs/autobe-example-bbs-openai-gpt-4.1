import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate soft deletion of a discussion board post both by its author and by an admin/moderator.
 *
 * This test ensures that a post in a discussion thread can be soft-deleted
 * first by its author and then by a simulated admin/moderator. It also ensures
 * that the deleted_at field is set in the deleted post, and id consistency is
 * maintained.
 *
 * Steps:
 * 1. Register a member (author).
 * 2. Register a second member (simulating a moderator/admin; no role elevation possible with the test API).
 * 3. Author creates a thread.
 * 4. Author creates a post in the thread.
 * 5. Author soft-deletes the post.
 * 6. Validate deleted_at is set and id matches after author deletion.
 * 7. Author creates another post.
 * 8. Second member (admin simulation) soft-deletes the post.
 * 9. Validate deleted_at is set and id matches after admin deletion.
 *
 * Note: Test cannot verify role-specific authorization, listing/filtering visibility,
 * or detail retrieval for admin due to absence of such endpoints in the current SDK.
 */
export async function test_api_discussionBoard_test_delete_post_success_author_and_admin(
  connection: api.IConnection,
) {
  // 1. Register member1 (author)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member1Email,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  // 2. Register member2 (admin/moderator simulation)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member2Email,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  // 3. Author creates a thread
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: member1.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(1),
      body: RandomGenerator.content()()(1),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 4. Author creates a post
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: member1.id,
      body: RandomGenerator.content()()(1),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 5. Author soft-deletes the post
  const erasedByAuthor = await api.functional.discussionBoard.posts.eraseById(connection, {
    id: post.id,
  });
  typia.assert(erasedByAuthor);
  TestValidator.predicate("deleted_at set after author soft delete")(typeof erasedByAuthor.deleted_at === "string" && erasedByAuthor.deleted_at.length > 0);
  TestValidator.equals("id after author soft delete")(erasedByAuthor.id)(post.id);

  // 6. Create another post
  const post2 = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: member1.id,
      body: RandomGenerator.content()()(1),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post2);

  // 7. Admin/moderator simulation soft-deletes the second post
  // (No role elevation or separate session is possible; simulates privileged user.)
  const erasedByAdmin = await api.functional.discussionBoard.posts.eraseById(connection, {
    id: post2.id,
  });
  typia.assert(erasedByAdmin);
  TestValidator.predicate("deleted_at set after admin soft delete")(typeof erasedByAdmin.deleted_at === "string" && erasedByAdmin.deleted_at.length > 0);
  TestValidator.equals("id after admin soft delete")(erasedByAdmin.id)(post2.id);
}