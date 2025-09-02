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

/**
 * Validate that a moderator can create a poll on a user's post.
 *
 * 1. Register a standard user (userA) and make sure context is authenticated
 *    as userA
 * 2. Create a thread as userA
 * 3. Create a post in that thread as userA
 * 4. Register a moderator (modA) and login as that moderator (switch context
 *    to moderator role)
 * 5. Moderator creates a poll on userA's post (even though they are not owner)
 * 6. Validate successful creation and schema compliance for the poll
 * 7. Ensure the poll is attached to the correct post, and all required
 *    attributes are present
 */
export async function test_api_poll_creation_success_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a standard user (userA)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAUsername = RandomGenerator.name();
  const userAPassword = RandomGenerator.alphaNumeric(14) + "Aa!";
  const userACreateDto = {
    email: userAEmail,
    username: userAUsername,
    password: userAPassword,
    consent: true,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.ICreate;
  const userAAuth = await api.functional.auth.user.join(connection, {
    body: userACreateDto,
  });
  typia.assert(userAAuth);
  const userA = userAAuth.user;

  // 2. Create a thread as userA
  const threadTitle = RandomGenerator.paragraph({ sentences: 4 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals(
    "userA is thread creator",
    thread.created_by_id,
    userA.id,
  );

  // 3. Create a post in the thread as userA
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
  TestValidator.equals("post belongs to thread", post.thread_id, thread.id);
  TestValidator.equals(
    "post is created by userA",
    post.created_by_id,
    userA.id,
  );

  // 4. Register a moderator and login as that moderator (context switch)
  const modAEmail = typia.random<string & tags.Format<"email">>();
  const modAUsername = RandomGenerator.name();
  const modAPassword = RandomGenerator.alphaNumeric(16) + "A!";
  const modACreateDto = {
    email: modAEmail,
    username: modAUsername,
    password: modAPassword,
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardModerator.IJoin;
  const modAJoin = await api.functional.auth.moderator.join(connection, {
    body: modACreateDto,
  });
  typia.assert(modAJoin);

  // Explicit login for context switch to moderator role
  const modALoginResult = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: modAEmail,
        password: modAPassword,
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(modALoginResult);

  // 5. Moderator creates a poll on userA's post
  const pollTitle = RandomGenerator.paragraph({ sentences: 3 });
  const pollDescription = RandomGenerator.content({ paragraphs: 1 });
  const now = new Date();
  const openedAt = now.toISOString();
  const closedAt = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 3,
  ).toISOString(); // 3 days later
  const pollInput = {
    discussion_board_post_id: post.id,
    title: pollTitle,
    description: pollDescription,
    multi_choice: false,
    opened_at: openedAt,
    closed_at: closedAt,
  } satisfies IDiscussionBoardPoll.ICreate;

  const poll =
    await api.functional.discussionBoard.moderator.posts.polls.create(
      connection,
      {
        postId: post.id,
        body: pollInput,
      },
    );
  typia.assert(poll);

  // 6. Validate successful creation and schema compliance for the poll
  TestValidator.equals(
    "poll is linked to correct post",
    poll.discussion_board_post_id,
    post.id,
  );
  TestValidator.equals("poll title matches input", poll.title, pollTitle);
  TestValidator.equals(
    "poll description matches input",
    poll.description,
    pollDescription,
  );
  TestValidator.equals("poll is single-choice", poll.multi_choice, false);
  TestValidator.equals(
    "poll opened_at matches input",
    poll.opened_at,
    openedAt,
  );
  TestValidator.equals(
    "poll closed_at matches input",
    poll.closed_at,
    closedAt,
  );
  TestValidator.predicate(
    "poll has id",
    typeof poll.id === "string" && poll.id.length > 0,
  );
  TestValidator.predicate(
    "poll created_at is valid ISO date",
    typeof poll.created_at === "string" &&
      !Number.isNaN(Date.parse(poll.created_at)),
  );
  TestValidator.predicate(
    "poll updated_at is valid ISO date",
    typeof poll.updated_at === "string" &&
      !Number.isNaN(Date.parse(poll.updated_at)),
  );
  TestValidator.equals("poll is not deleted", poll.deleted_at, null);
}
