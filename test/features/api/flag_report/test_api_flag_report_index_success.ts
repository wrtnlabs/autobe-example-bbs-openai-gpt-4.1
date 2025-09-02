import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";
import type { IPageIDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFlagReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Comprehensive test of moderator flag report triage access and filtering.
 *
 * This test verifies that a moderator can:
 *
 * - Retrieve a paginated, correctly filtered list of flag reports using PATCH
 *   /discussionBoard/moderator/flagReports
 * - See only those reports matching filter criteria such as contentType,
 *   status, reason, and keyword search
 * - Access is granted only to moderators, and denied to standard users
 *   (negative check)
 *
 * Steps:
 *
 * 1. Register a moderator and save their credentials.
 * 2. Register two user accounts with unique emails and usernames.
 * 3. As User1, create a new thread.
 * 4. As User1, create two posts within that thread, each with unique titles
 *    and bodies.
 * 5. As User2, create a separate unrelated thread for variety.
 * 6. As User2, flag both posts in the first thread with reason 'spam' and
 *    unique details, using /discussionBoard/user/flagReports.
 * 7. Switch to moderator, call PATCH /discussionBoard/moderator/flagReports
 *    with filters: contentType 'post', status 'pending', reason 'spam',
 *    limit 2, search a keyword from post titles.
 * 8. Assert all returned reports match filters (content type, status, reason,
 *    keyword in title), and pagination metadata is consistent.
 * 9. Negative: Assert a non-moderator user is forbidden from using the
 *    endpoint.
 */
export async function test_api_flag_report_index_success(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name();
  const moderatorPassword = "ModeratorPwd1!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderator);

  // 2. Register two users
  const userEmails = [
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
  ];
  const userUsernames = [RandomGenerator.name(), RandomGenerator.name()];
  const userPassword = "UserPwd1!";

  // User1 join & login
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmails[0],
      username: userUsernames[0],
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1);

  // 3. User1 creates a thread
  const thread1 = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread1);

  // 4. User1 creates two posts in thread1
  const postTitles = [
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
  ];
  const postBodies = [
    RandomGenerator.content({ paragraphs: 1 }),
    RandomGenerator.content({ paragraphs: 1 }),
  ];
  const posts = [];
  for (let i = 0; i < 2; ++i) {
    const post = await api.functional.discussionBoard.user.threads.posts.create(
      connection,
      {
        threadId: thread1.id,
        body: {
          thread_id: thread1.id,
          title: postTitles[i],
          body: postBodies[i],
        } satisfies IDiscussionBoardPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // 5. Register & login as User2
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmails[1],
      username: userUsernames[1],
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmails[1],
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 6. As User2, create a separate thread (not flagged)
  const thread2 = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread2);

  // As User2, flag both posts in thread1 with reason 'spam'
  const reasons = ["spam", "spam"];
  const details = [
    RandomGenerator.paragraph({ sentences: 6 }),
    RandomGenerator.paragraph({ sentences: 6 }),
  ];
  const flagReports = [];
  for (let i = 0; i < 2; ++i) {
    const flagReport =
      await api.functional.discussionBoard.user.flagReports.create(connection, {
        body: {
          postId: posts[i].id,
          reason: reasons[i],
          details: details[i],
        } satisfies IDiscussionBoardFlagReport.ICreate,
      });
    typia.assert(flagReport);
    flagReports.push(flagReport);
  }

  // 7. Switch to moderator and login
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 8. Query flag reports with filters including keyword from one of the postTitles
  const searchKeyword = RandomGenerator.pick(postTitles).split(" ")[0];
  const moderationReportPage =
    await api.functional.discussionBoard.moderator.flagReports.index(
      connection,
      {
        body: {
          contentType: "post",
          status: "pending",
          reason: "spam",
          limit: 2,
          search: searchKeyword,
        } satisfies IDiscussionBoardFlagReport.IRequest,
      },
    );
  typia.assert(moderationReportPage);
  const { pagination, data } = moderationReportPage;

  for (const report of data) {
    TestValidator.equals(
      "Flag report is for a post",
      typeof report.postId,
      "string",
    );
    TestValidator.equals(
      "Flag report status is pending",
      report.status,
      "pending",
    );
    TestValidator.equals("Flag report reason is spam", report.reason, "spam");
    const post = posts.find((p) => p.id === report.postId);
    TestValidator.predicate(
      "Report comes from flagged posts with searched keyword",
      typeof post !== "undefined" && post.title.includes(searchKeyword),
    );
  }
  TestValidator.equals("Pagination limit matches", pagination.limit, 2);
  TestValidator.predicate(
    "Pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("Total reports >= 1", pagination.records >= 1);
  TestValidator.predicate("Pages >= 1", pagination.pages >= 1);

  // 9. Negative: verify non-moderator user access is forbidden
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmails[0],
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  await TestValidator.error(
    "Non-moderator should not access moderator flagReports endpoint",
    async () => {
      await api.functional.discussionBoard.moderator.flagReports.index(
        connection,
        {
          body: {
            contentType: "post",
            status: "pending",
          } satisfies IDiscussionBoardFlagReport.IRequest,
        },
      );
    },
  );
}
