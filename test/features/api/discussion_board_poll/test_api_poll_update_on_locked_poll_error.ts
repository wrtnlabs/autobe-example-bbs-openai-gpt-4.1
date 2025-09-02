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

/**
 * Test that updating a locked/closed poll fails as expected (forbidden by
 * business rules).
 *
 * 1. Register and authenticate a standard user.
 * 2. Create a new discussion thread.
 * 3. Create a post within this thread.
 * 4. Create a poll with a closed window (closed_at in the past, so poll is
 *    already closed).
 * 5. Attempt to update the closed poll; expect a business rule violation
 *    (error thrown).
 *
 * This confirms that modifications to locked/closed polls are properly
 * rejected by the API.
 */
export async function test_api_poll_update_on_locked_poll_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user (auto login by join)
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "Aa!1",
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);

  // 2. Create thread
  const threadInput = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardThread.ICreate;
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    { body: threadInput },
  );
  typia.assert(thread);

  // 3. Create post in thread
  const postInput = {
    thread_id: thread.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardPost.ICreate;
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: postInput,
    },
  );
  typia.assert(post);

  // 4. Create closed poll for this post (closed_at before now; opened_at in the past)
  const now = new Date();
  const opened_at = new Date(now.getTime() - 1000 * 60 * 60).toISOString(); // 1 hour ago
  const closed_at = new Date(now.getTime() - 1000 * 60).toISOString(); // 1 minute ago
  const pollInput = {
    discussion_board_post_id: post.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    multi_choice: false,
    opened_at,
    closed_at,
  } satisfies IDiscussionBoardPoll.ICreate;
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: pollInput,
    },
  );
  typia.assert(poll);

  // 5. Try to update the poll (should fail: poll is closed)
  await TestValidator.error(
    "updating a closed poll should be forbidden",
    async () => {
      await api.functional.discussionBoard.user.posts.polls.update(connection, {
        postId: post.id,
        pollId: poll.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardPoll.IUpdate,
      });
    },
  );
}
