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
import type { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import type { IPageIDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPoll";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardPollSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollSummary";

/**
 * End-to-end test for moderator poll listing, filtering, and permissions.
 *
 * This function validates that a moderator can create and successfully list
 * polls attached to a post with various filters and pagination, while
 * ensuring that unauthorized users (standard users) are denied access. The
 * workflow simulates two actors:
 *
 * - Moderator (privileged)
 * - Standard User covering registration, content creation, authentication
 *   switching, poll creation, listing with filter, and permission boundary
 *   enforcement.
 *
 * Steps:
 *
 * 1. Register and authenticate a moderator via moderator join API (save
 *    credentials for login reuse).
 * 2. Register a standard user via user join API (save credentials for login
 *    reuse).
 * 3. As standard user, create a new thread (thread title is random).
 * 4. As standard user, create a post in that thread (random title and body).
 * 5. As moderator (switching authentication via login if needed), create a
 *    poll on the user's post.
 * 6. As moderator, use the listing (PATCH polls.index) endpoint with relevant
 *    filters and validate poll data, pagination, filter correctness.
 * 7. As standard user (switch back via login), attempt to access moderator
 *    poll listing endpoint and validate permission error is thrown.
 */
export async function test_api_moderator_poll_listing_for_post_filtering_and_permissions(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name();
  const moderatorPassword = RandomGenerator.alphaNumeric(12) + "A@1";
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorJoin);

  // 2. Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(12) + "A@1";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // 3. Switch to user authentication if needed (re-login for clean context)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 4. Create a new thread as user
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 5. Create a post in the thread as user
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 4,
          sentenceMax: 8,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Switch to moderator authentication to get required permissions
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 7. Create a poll linked to the post as moderator
  const pollTitle = RandomGenerator.paragraph({ sentences: 4 });
  const pollCreate =
    await api.functional.discussionBoard.moderator.posts.polls.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          title: pollTitle,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          multi_choice: RandomGenerator.pick([true, false]),
          opened_at: new Date().toISOString(),
          closed_at: null,
        } satisfies IDiscussionBoardPoll.ICreate,
      },
    );
  typia.assert(pollCreate);

  // 8. Use the poll listing endpoint as moderator, with filter(s) (e.g., multi_choice, partial title, page=1, limit=5)
  const filter: IDiscussionBoardPoll.IRequest = {
    page: 1,
    limit: 5,
    post_id: post.id,
    title: pollTitle.slice(0, 3),
    multi_choice: pollCreate.multi_choice,
  } satisfies IDiscussionBoardPoll.IRequest;
  const pollIndex =
    await api.functional.discussionBoard.moderator.posts.polls.index(
      connection,
      {
        postId: post.id,
        body: filter,
      },
    );
  typia.assert(pollIndex);
  // Poll with specific title and post_id should be found
  TestValidator.predicate(
    "moderator poll listing contains the created poll",
    pollIndex.data.some((p) => p.id === pollCreate.id),
  );
  TestValidator.predicate(
    "pagination meta present and record count >= 1",
    pollIndex.pagination.records >= 1,
  );

  // 9. Switch to user account and try listing as user (should fail with permission error)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  await TestValidator.error(
    "user cannot access moderator poll listing endpoint",
    async () => {
      await api.functional.discussionBoard.moderator.posts.polls.index(
        connection,
        {
          postId: post.id,
          body: filter,
        },
      );
    },
  );
}
