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
 * Validate successful creation of a poll on a discussion board post by the
 * post's owner.
 *
 * This scenario emulates a standard business workflow:
 *
 * 1. User registration & authentication
 * 2. User creates a discussion thread
 * 3. User creates a post in that thread
 * 4. User creates a poll on that post with all required fields
 * 5. The system returns the created poll with correct metadata, associated to
 *    the proper post
 *
 * The test ensures that:
 *
 * - Only authenticated users can create polls
 * - The owner of the post is creating the poll
 * - Poll metadata and linkage (discussion_board_post_id, title, description,
 *   multi_choice, opened_at, closed_at) are persisted and returned as
 *   expected
 * - Timestamps/fields follow expected structure (ISO strings, nullability,
 *   etc.)
 */
export async function test_api_poll_creation_success_by_post_owner(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(12) + "Ab!1";
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        username,
        password: userPassword,
        display_name: RandomGenerator.name(),
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);
  // Step 2: User creates a thread
  const threadTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 12,
  });
  const thread: IDiscussionBoardThread =
    await api.functional.discussionBoard.user.threads.create(connection, {
      body: { title: threadTitle } satisfies IDiscussionBoardThread.ICreate,
    });
  typia.assert(thread);
  TestValidator.equals(
    "thread creator should match registering user",
    thread.created_by_id,
    user.user.id,
  );

  // Step 3: User creates a post in that thread
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.user.threads.posts.create(connection, {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: postTitle,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals(
    "post created_by_id matches user",
    post.created_by_id,
    user.user.id,
  );
  TestValidator.equals(
    "post thread_id matches thread",
    post.thread_id,
    thread.id,
  );

  // Step 4: User creates a poll associated to their own post
  const pollTitle = RandomGenerator.paragraph({ sentences: 4 });
  const pollDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 7,
  });
  const now = new Date();
  const openAt = now.toISOString();
  // Set closeAt to 3 days ahead
  const closeAt = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Compose create-poll request
  const pollCreate: IDiscussionBoardPoll.ICreate = {
    discussion_board_post_id: post.id,
    title: pollTitle,
    description: pollDescription,
    multi_choice: false,
    opened_at: openAt,
    closed_at: closeAt,
  };
  const poll: IDiscussionBoardPoll =
    await api.functional.discussionBoard.user.posts.polls.create(connection, {
      postId: post.id,
      body: pollCreate,
    });
  typia.assert(poll);
  // Step 5: Validate poll was created/linked and contains expected data
  TestValidator.equals(
    "poll's post linkage is correct",
    poll.discussion_board_post_id,
    post.id,
  );
  TestValidator.equals(
    "poll returned title matches input",
    poll.title,
    pollTitle,
  );
  TestValidator.equals(
    "poll returned description matches input",
    poll.description,
    pollDescription,
  );
  TestValidator.equals(
    "poll multi_choice flag persists",
    poll.multi_choice,
    false,
  );
  TestValidator.equals("poll opened_at is correct", poll.opened_at, openAt);
  TestValidator.equals("poll closed_at is correct", poll.closed_at, closeAt);
  // Meta validation
  TestValidator.predicate(
    "poll id looks like a UUID",
    typeof poll.id === "string" &&
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(
        poll.id,
      ),
  );
  TestValidator.predicate(
    "poll created_at is ISO string",
    typeof poll.created_at === "string" && poll.created_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "poll updated_at is ISO string",
    typeof poll.updated_at === "string" && poll.updated_at.endsWith("Z"),
  );
  TestValidator.equals(
    "poll deleted_at must be null or undefined",
    poll.deleted_at,
    null,
  );
}
