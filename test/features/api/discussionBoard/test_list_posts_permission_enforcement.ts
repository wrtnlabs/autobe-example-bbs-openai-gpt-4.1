import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Permission and visibility enforcement for post list/searching.
 *
 * This test verifies that the discussion board correctly enforces visibility of posts depending on user role:
 * - Guests (unauthenticated) only see visible (non-deleted) posts
 * - Members only see active posts
 * - Admin/moderators can see soft-deleted posts (omitted since no such API)
 *
 * **Test Steps:**
 * 1. Create two regular members (memberA and memberB)
 * 2. Create one thread as memberA (random category UUID)
 * 3. Create three posts in that thread:
 *    - postA by memberA
 *    - postB by memberB
 *    - postC by memberA
 * 4. Soft-delete postB
 * 5. As a guest (no login), search posts: verify only postA and postC visible, postB (soft-deleted) absent
 * 6. As memberA (same as guest in current API), verify visibility
 * 7. As memberB (same as guest in current API), verify visibility - should NOT see their own soft-deleted post
 *
 * **Note:**
 * - This test assumes default API permissions where even post authors do not see their own soft-deleted content unless via an admin endpoint (not present in accessible API).
 * - No admin/moderator check, as there is no such login/role or endpoint in this system.
 * - All logins and state transitions are omitted, as authentication API is not available.
 */
export async function test_api_discussionBoard_test_list_posts_permission_enforcement(
  connection: api.IConnection,
) {
  // 1. Create two regular members
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<'email'>>(),
      hashed_password: RandomGenerator.alphaNumeric(32),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);

  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<'email'>>(),
      hashed_password: RandomGenerator.alphaNumeric(32),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  // 2. Create one thread as memberA
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: memberA.id,
      discussion_board_category_id: typia.random<string & tags.Format<'uuid'>>(),
      title: RandomGenerator.paragraph()(10),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 3. Create three posts in that thread
  const postA = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: memberA.id,
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(postA);

  const postB = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: memberB.id,
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(postB);

  const postC = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: memberA.id,
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(postC);

  // 4. Soft-delete postB
  const deletedPostB = await api.functional.discussionBoard.posts.eraseById(connection, {
    id: postB.id,
  });
  typia.assert(deletedPostB);
  TestValidator.equals('Post B should be soft-deleted')(deletedPostB.deleted_at !== null)(true);

  // 5. As guest (no login), search posts in this thread
  const guestPosts = await api.functional.discussionBoard.posts.patch(connection, {
    body: {
      thread_id: thread.id,
      page: 1,
      limit: 20,
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(guestPosts);
  // Guests see only non-deleted posts
  TestValidator.predicate('Guest cannot see soft-deleted postB')(
    !guestPosts.data.some(p => p.id === postB.id)
  );
  TestValidator.predicate('Guest can see postA and postC')(
    guestPosts.data.some(p => p.id === postA.id) &&
    guestPosts.data.some(p => p.id === postC.id)
  );

  // 6. As memberA: search posts in this thread (for current API, role = guest)
  const memberAPosts = await api.functional.discussionBoard.posts.patch(connection, {
    body: {
      thread_id: thread.id,
      page: 1,
      limit: 20,
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(memberAPosts);
  TestValidator.predicate('MemberA cannot see soft-deleted postB')(
    !memberAPosts.data.some(p => p.id === postB.id)
  );
  TestValidator.predicate('MemberA can see postA and postC')(
    memberAPosts.data.some(p => p.id === postA.id) &&
    memberAPosts.data.some(p => p.id === postC.id)
  );

  // 7. As memberB: search posts in this thread - verify cannot see soft-deleted postB
  const memberBPosts = await api.functional.discussionBoard.posts.patch(connection, {
    body: {
      thread_id: thread.id,
      page: 1,
      limit: 20,
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(memberBPosts);
  TestValidator.predicate('MemberB cannot see their own soft-deleted postB')(
    !memberBPosts.data.some(p => p.id === postB.id)
  );
}