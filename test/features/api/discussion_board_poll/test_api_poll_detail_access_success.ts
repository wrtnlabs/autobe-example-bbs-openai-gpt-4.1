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
 * Test successful retrieval of poll details for an existing poll by an
 * authenticated user.
 *
 * 1. Register a new user via the join endpoint; authentication is established
 *    automatically
 * 2. Create a thread using the authenticated user
 * 3. Create a post in the newly created thread
 * 4. Create a poll on the post (provide full details: title, multi_choice,
 *    opened_at, etc.)
 * 5. Retrieve the poll details by pollId and postId with GET
 *    /discussionBoard/user/posts/{postId}/polls/{pollId}
 * 6. Assert that the poll object returned matches all created properties and
 *    referential fields
 * 7. Assert that the poll belongs to the correct post and relevant timestamps
 *    exist
 */
export async function test_api_poll_detail_access_success(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "Aa!";
  const displayName = RandomGenerator.name();

  const joinOutput = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinOutput);

  // 2. Create a thread
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

  // 3. Create a post in the thread
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: postTitle,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a poll on the post
  const pollTitle = RandomGenerator.paragraph({ sentences: 2 });
  const pollDescription = RandomGenerator.content({ paragraphs: 1 });
  const now = new Date();
  const openedAt = now.toISOString();
  const closedAt = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 3 days after
  const multiChoice = Math.random() < 0.5;
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: pollTitle,
        description: pollDescription,
        multi_choice: multiChoice,
        opened_at: openedAt,
        closed_at: closedAt,
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 5. Retrieve poll details
  const fetchedPoll = await api.functional.discussionBoard.user.posts.polls.at(
    connection,
    {
      postId: post.id,
      pollId: poll.id,
    },
  );
  typia.assert(fetchedPoll);

  // 6. Assert poll details match those provided at creation
  TestValidator.equals("poll id matches", fetchedPoll.id, poll.id);
  TestValidator.equals("poll title", fetchedPoll.title, pollTitle);
  TestValidator.equals(
    "poll description",
    fetchedPoll.description,
    pollDescription,
  );
  TestValidator.equals(
    "multi_choice flag",
    fetchedPoll.multi_choice,
    multiChoice,
  );
  TestValidator.equals("opened_at matches", fetchedPoll.opened_at, openedAt);
  TestValidator.equals("closed_at matches", fetchedPoll.closed_at, closedAt);

  // 7. Assert referential and timestamp fields
  TestValidator.equals(
    "poll belongs to correct post",
    fetchedPoll.discussion_board_post_id,
    post.id,
  );
  TestValidator.predicate(
    "created_at present",
    typeof fetchedPoll.created_at === "string" &&
      fetchedPoll.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof fetchedPoll.updated_at === "string" &&
      fetchedPoll.updated_at.length > 0,
  );
  TestValidator.equals("poll is not deleted", fetchedPoll.deleted_at, null);
}
