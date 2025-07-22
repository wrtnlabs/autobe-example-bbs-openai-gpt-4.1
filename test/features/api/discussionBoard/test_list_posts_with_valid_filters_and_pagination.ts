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
 * Verify post listing, search, and pagination with realistic data and filters.
 *
 * This test ensures that post retrieval with filtering and pagination returns only
 * the expected posts. It populates the board with posts from multiple members and
 * threads, then tests:
 *   - Filtering by thread_id
 *   - Filtering by discussion_board_member_id
 *   - Filtering by date/time window
 *   - Full-text (body) keyword search
 *   - Pagination/limit (page/limit parameters)
 * Validates that only correctly matching posts are returned and verifies
 * pagination metadata.
 *
 * Steps:
 * 1. Create two unique member accounts.
 * 2. Create two threads from one of the members (on potentially different categories).
 * 3. Post several posts across both threads and both members, with distinct post bodies.
 * 4. List posts filtered by thread_id and verify returned posts.
 * 5. List posts filtered by member and verify returned posts.
 * 6. List posts filtered by date-time window and confirm results.
 * 7. List posts by keyword search in body and verify matches.
 * 8. List posts with limit/page and verify correct paginated results & metadata.
 */
export async function test_api_discussionBoard_test_list_posts_with_valid_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create two unique members
  const member1 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member1);

  const member2 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member2);

  // 2. Create two threads (from member1, for determinism)
  const thread1 = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: member1.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(12),
      body: RandomGenerator.content()(2)(3),
    },
  });
  typia.assert(thread1);

  const thread2 = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: member1.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(12),
      body: RandomGenerator.content()(2)(3),
    },
  });
  typia.assert(thread2);

  // 3. Create several posts across threads and members (record time for date filter)
  const postBodies = [
    "Discussion about feature testing.",
    "How to mock pagination in e2e tests?",
    "Advanced uuid filtering scenario.",
    "Exploring thread relationships.",
  ];
  const posted: { post: IDiscussionBoardPost, threadId: string, memberId: string, body: string, createdAt: string }[] = [];

  // First two posts by member1 on thread1
  for (let i = 0; i < 2; ++i) {
    const post = await api.functional.discussionBoard.posts.post(connection, {
      body: {
        discussion_board_thread_id: thread1.id,
        discussion_board_member_id: member1.id,
        body: postBodies[i],
      },
    });
    typia.assert(post);
    posted.push({ post, threadId: thread1.id, memberId: member1.id, body: postBodies[i], createdAt: post.created_at });
  }
  // Third by member2 on thread2
  const postA = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread2.id,
      discussion_board_member_id: member2.id,
      body: postBodies[2],
    },
  });
  typia.assert(postA);
  posted.push({ post: postA, threadId: thread2.id, memberId: member2.id, body: postBodies[2], createdAt: postA.created_at });

  // Fourth by member1 on thread2
  const postB = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread2.id,
      discussion_board_member_id: member1.id,
      body: postBodies[3],
    },
  });
  typia.assert(postB);
  posted.push({ post: postB, threadId: thread2.id, memberId: member1.id, body: postBodies[3], createdAt: postB.created_at });

  // 4. Filter by thread_id (thread1)
  const thread1List = await api.functional.discussionBoard.posts.patch(connection, {
    body: {
      thread_id: thread1.id,
    },
  });
  typia.assert(thread1List);
  TestValidator.predicate("all posts are for thread1")(thread1List.data.every(x => x.discussion_board_thread_id === thread1.id));
  // Should include the expected two posts (for this thread)
  TestValidator.equals("thread1 post count")(thread1List.data.length)(2);

  // 5. Filter by member (member1)
  const member1Posts = await api.functional.discussionBoard.posts.patch(connection, {
    body: {
      discussion_board_member_id: member1.id,
    },
  });
  typia.assert(member1Posts);
  TestValidator.predicate("posts are authored by member1")(member1Posts.data.every(x => x.discussion_board_member_id === member1.id));
  // Should be 3 for member1
  const member1Count = posted.filter(p => p.memberId === member1.id).length;
  TestValidator.equals("member1 authored posts")(member1Posts.data.length)(member1Count);

  // 6. Filter by date/time window (after creation of the first post)
  const minDate = posted[1].createdAt;
  const dateFiltered = await api.functional.discussionBoard.posts.patch(connection, {
    body: {
      created_after: minDate,
    },
  });
  typia.assert(dateFiltered);
  TestValidator.predicate("all posts are after minDate")(dateFiltered.data.every(x => x.created_at > minDate));

  // 7. Keyword search in body ("feature")
  const keywordRes = await api.functional.discussionBoard.posts.patch(connection, {
    body: {
      keyword: "feature",
    },
  });
  typia.assert(keywordRes);
  TestValidator.predicate("keyword-matched posts")(keywordRes.data.every(x => x.body.toLowerCase().includes("feature")));

  // 8. Pagination: set limit=2
  const pagedRes = await api.functional.discussionBoard.posts.patch(connection, {
    body: {
      limit: 2,
      page: 1,
    },
  });
  typia.assert(pagedRes);
  TestValidator.equals("pagination limit param")(pagedRes.pagination.limit)(2);
  TestValidator.equals("pagination page param")(pagedRes.pagination.current)(1);
  TestValidator.predicate("paged result fits limit")(pagedRes.data.length <= 2);
  // Page 2
  const pagedRes2 = await api.functional.discussionBoard.posts.patch(connection, {
    body: {
      limit: 2,
      page: 2,
    },
  });
  typia.assert(pagedRes2);
  TestValidator.equals("pagination page param 2")(pagedRes2.pagination.current)(2);
}