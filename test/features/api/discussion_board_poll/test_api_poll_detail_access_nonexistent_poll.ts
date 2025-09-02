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
 * Verify error handling for non-existent poll detail retrieval.
 *
 * This test ensures that when a user requests details for a pollId that
 * does not exist (and was not created) on an actual post, the API correctly
 * returns an error rather than an invalid poll or system error. The setup
 * workflow covers the required user authentication, thread, and post
 * creation steps so that the negative poll lookup runs in a valid resource
 * context.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new user (with unique credentials and
 *    consent=true)
 * 2. Create a thread with a random unique title
 * 3. Create a post in the thread (with unique title and body)
 * 4. Attempt to access poll details for the created post but with a random
 *    (non-existent) pollId
 * 5. Check that an error is raised (using TestValidator.error with a
 *    descriptive title)
 */
export async function test_api_poll_detail_access_nonexistent_poll(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const userInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    consent: true,
  };
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);

  // 2. Create a thread
  const threadInput: IDiscussionBoardThread.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    { body: threadInput },
  );
  typia.assert(thread);

  // 3. Create a post in the thread
  const postInput: IDiscussionBoardPost.ICreate = {
    thread_id: thread.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  };
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    { threadId: thread.id, body: postInput },
  );
  typia.assert(post);

  // 4 & 5. Attempt to fetch a poll for the post using a random pollId (should not exist)
  await TestValidator.error(
    "API should reject access to non-existent poll for valid post",
    async () => {
      await api.functional.discussionBoard.user.posts.polls.at(connection, {
        postId: post.id,
        pollId: typia.random<string & tags.Format<"uuid">>(), // random, not associated
      });
    },
  );
}
