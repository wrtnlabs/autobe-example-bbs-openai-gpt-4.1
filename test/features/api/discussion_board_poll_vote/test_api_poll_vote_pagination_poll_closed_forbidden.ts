import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import type { IDiscussionBoardPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollVote";
import type { IPageIDiscussionBoardPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPollVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that standard users are forbidden from listing poll vote history
 * on a closed poll.
 *
 * Business rule: When a poll is closed (closed_at set), standard users are
 * not allowed to retrieve vote result listings via the pagination endpoint.
 * Only moderators/admins or specifically-permitted users may be allowed for
 * closed poll votes; for standard users, permission should be denied.
 *
 * Steps:
 *
 * 1. Register and authenticate as a standard user.
 * 2. Create a new discussion thread.
 * 3. Create a new post within the thread.
 * 4. Attach a new poll to the post, with opened_at in the past, closed_at
 *    initially null.
 * 5. Close the poll by updating its closed_at to a timestamp in the past
 *    (before current time).
 * 6. Attempt to list vote records for the poll as a standard user after
 *    closure using the poll votes pagination endpoint.
 * 7. Validate that the API returns a forbidden error, confirming access
 *    restriction for closed poll vote history.
 *
 * Notes:
 *
 * - Do NOT attempt to validate error messages or codes; only validate that a
 *   runtime (forbidden) error is thrown.
 * - Test does not require a second user to vote in the poll since vote
 *   listing is forbidden regardless of contents after closure.
 * - Closed_at must be set to a past value (use new Date(Date.now() -
 *   60000).toISOString())
 */
export async function test_api_poll_vote_pagination_poll_closed_forbidden(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as standard user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "aA!1";
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(registration);
  TestValidator.equals(
    "registered email matches",
    registration.user.email,
    email,
  );
  TestValidator.equals(
    "registered username matches",
    registration.user.username,
    username,
  );
  TestValidator.predicate(
    "user is not suspended",
    registration.user.is_suspended === false,
  );
  TestValidator.predicate(
    "user is not verified by default",
    registration.user.is_verified === false,
  );

  // 2. Create a discussion thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals(
    "thread title matches input",
    thread.title,
    thread.title,
  );

  // 3. Create a post within the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post thread_id matches", post.thread_id, thread.id);

  // 4. Attach a new poll to the post
  const now = new Date();
  const openedAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        multi_choice: false,
        opened_at: openedAt,
        closed_at: null,
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll);
  TestValidator.equals(
    "poll post_id matches",
    poll.discussion_board_post_id,
    post.id,
  );
  TestValidator.equals(
    "poll opened_at matches input",
    poll.opened_at,
    openedAt,
  );
  TestValidator.equals(
    "poll closed_at is initially null",
    poll.closed_at,
    null,
  );

  // 5. Close the poll by updating closed_at
  const closedAt = new Date(now.getTime() - 60000).toISOString(); // 1 minute ago
  const pollClosed =
    await api.functional.discussionBoard.user.posts.polls.update(connection, {
      postId: post.id,
      pollId: poll.id,
      body: {
        closed_at: closedAt,
      } satisfies IDiscussionBoardPoll.IUpdate,
    });
  typia.assert(pollClosed);
  TestValidator.equals(
    "poll now has closed_at as set",
    pollClosed.closed_at,
    closedAt,
  );

  // 6. Attempt forbidden poll vote history access as standard user after closure
  await TestValidator.error(
    "standard user forbidden from poll vote listing on closed poll",
    async () => {
      await api.functional.discussionBoard.user.polls.pollVotes.index(
        connection,
        {
          pollId: poll.id,
          body: {},
        },
      );
    },
  );
}
