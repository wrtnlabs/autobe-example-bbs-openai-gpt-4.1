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
 * Test successful update of a poll by the original post author
 *
 * This E2E test covers the full business journey for a typical poll update
 * workflow:
 *
 * 1. Register and authenticate as a discussion board user
 * 2. Create a thread as that user
 * 3. Create a post within that thread
 * 4. Create a poll attached to the post
 * 5. Update the poll's title, description, multi_choice flag, and closed_at
 *
 * The test verifies that only fields allowed by business and schema rules
 * are mutated (title/description/multi_choice/closed_at), that the update
 * succeeds, that IDs remain stable, and that the updated_at timestamp
 * refreshes to reflect the change. This validates both the correct function
 * of the endpoint and enforcement of poll-editing business constraints.
 */
export async function test_api_poll_update_by_author_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name().replace(/\s+/g, "_").toLowerCase();
  const password = RandomGenerator.alphaNumeric(12) + "A!1";
  const joinRes = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinRes);

  // 2. Create thread as user
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: { title: threadTitle } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post within the thread
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
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
  const pollStart = new Date(Date.now() - 5 * 60000).toISOString(); // Poll opened 5m ago
  const pollClose = new Date(Date.now() + 60 * 60000).toISOString(); // Closes in +60m
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
          wordMin: 5,
          wordMax: 12,
        }),
        multi_choice: false,
        opened_at: pollStart,
        closed_at: pollClose,
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 5. Update the poll's fields as the post author
  const newTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const newDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 9,
  });
  const updateReq: IDiscussionBoardPoll.IUpdate = {
    title: newTitle,
    description: newDescription,
    multi_choice: true, // Switch poll to multi_choice
    closed_at: null, // Set poll to never close
  };
  const updatedPoll =
    await api.functional.discussionBoard.user.posts.polls.update(connection, {
      postId: post.id,
      pollId: poll.id,
      body: updateReq,
    });
  typia.assert(updatedPoll);

  // Validate all expected updates and business constraints
  TestValidator.equals(
    "poll id is unchanged after update",
    updatedPoll.id,
    poll.id,
  );
  TestValidator.equals(
    "poll post id unchanged after update",
    updatedPoll.discussion_board_post_id,
    post.id,
  );
  TestValidator.equals(
    "poll title updated as requested",
    updatedPoll.title,
    newTitle,
  );
  TestValidator.equals(
    "poll description updated as requested",
    updatedPoll.description,
    newDescription,
  );
  TestValidator.equals(
    "poll multi_choice flag updated",
    updatedPoll.multi_choice,
    true,
  );
  TestValidator.equals(
    "poll opened_at remains the same",
    updatedPoll.opened_at,
    poll.opened_at,
  );
  TestValidator.equals(
    "poll closed_at set to null indicating poll never closes",
    updatedPoll.closed_at,
    null,
  );
  TestValidator.notEquals(
    "poll updated_at timestamp is different after update",
    updatedPoll.updated_at,
    poll.updated_at,
  ); // timestamp must update
}
