import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import type { IPageIDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPoll";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardPollSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollSummary";

/**
 * Test admin-only poll listing with advanced filtering, pagination, and
 * authorization enforcement.
 *
 * 1. Register and login as admin (creates a verified user first, then elevates
 *    to admin role).
 * 2. Register and login as a standard user.
 * 3. As user: create a thread, then create a post in that thread.
 * 4. As admin: create at least two polls on the post (one single-choice, one
 *    multi-choice with overlapping time/date fields).
 * 5. As admin: perform PATCH /discussionBoard/admin/posts/{postId}/polls with
 *    complex filter body:
 *
 *    - Filter by title substring and multi_choice flag combination
 *    - Paginate: set limit=1 and page=1 to ensure pagination logic is enforced
 * 6. Validate the response contents: returned data matches advanced filter and
 *    pagination criteria, and total records count matches number of created
 *    polls.
 * 7. Switch to standard user auth, attempt PATCH
 *    /discussionBoard/admin/posts/{postId}/polls and validate that access
 *    is denied.
 */
export async function test_api_admin_poll_listing_with_advanced_filtering_and_permissions(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "AdminPassword1!",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);

  // Elevate to admin
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  const adminEmail = adminUser.user.email;
  const adminPassword = "AdminPassword1!";

  // 2. Register and login as standard user
  const userPassword = "UserPassword1!";
  const userReg = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userReg);

  const userEmail = userReg.user.email;

  // Switch session: login as user
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 3. As user: create thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3b. As user: create post in thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Switch session: login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 4b. As admin: create two polls on the post
  const pollTitlePrefix = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const now = new Date();
  const dt1 = new Date(now.getTime() + 60000).toISOString();
  const dt2 = new Date(now.getTime() + 120000).toISOString();
  // Single-choice
  const poll1 = await api.functional.discussionBoard.admin.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: pollTitlePrefix + " Alpha",
        description: RandomGenerator.paragraph({ sentences: 6 }),
        multi_choice: false,
        opened_at: dt1,
        closed_at: null,
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll1);
  // Multi-choice
  const poll2 = await api.functional.discussionBoard.admin.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: pollTitlePrefix + " Beta",
        description: RandomGenerator.paragraph({ sentences: 4 }),
        multi_choice: true,
        opened_at: dt2,
        closed_at: null,
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll2);

  // 5. As admin: list/filter/paginate polls
  // Filter so only poll2 should match (multi_choice: true, title substring 'Beta', pagination page=1, limit=1)
  const filterBody = {
    title: "Beta",
    multi_choice: true,
    limit: 1,
    page: 1,
    post_id: post.id,
    sort_by: "created_at",
    sort_order: "asc",
  } satisfies IDiscussionBoardPoll.IRequest;
  const pollsPage =
    await api.functional.discussionBoard.admin.posts.polls.index(connection, {
      postId: post.id,
      body: filterBody,
    });
  typia.assert(pollsPage);
  TestValidator.equals("Pagination limit 1", pollsPage.pagination.limit, 1);
  TestValidator.equals("Pagination page 1", pollsPage.pagination.current, 1);
  TestValidator.predicate(
    "At least one poll is returned by filter",
    pollsPage.data.length >= 1,
  );
  for (const poll of pollsPage.data) {
    TestValidator.predicate(
      "Filtered poll is multi_choice",
      poll.multi_choice === true,
    );
    TestValidator.predicate(
      "Filtered poll title contains 'Beta'",
      poll.title.includes("Beta"),
    );
  }

  // 6. Switch to user: access denied for poll listing endpoint
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  await TestValidator.error(
    "Non-admin cannot list polls via admin endpoint",
    async () => {
      await api.functional.discussionBoard.admin.posts.polls.index(connection, {
        postId: post.id,
        body: filterBody,
      });
    },
  );
}
