import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * E2E test for successful comment creation by registered user
 *
 * This test validates the full positive flow for comment creation on a
 * discussion board:
 *
 * 1. Register and authenticate a new discussion board user (with proper
 *    consent)
 * 2. As that user, create a new discussion thread (with a unique, realistic
 *    title)
 * 3. As the thread creator, create a post inside that thread (with random text
 *    content)
 * 4. As the same user, create a comment on the newly created post
 * 5. Assert that the comment is correctly mapped to the post and user, and
 *    carries the expected content
 *
 * Steps:
 *
 * - All API calls use the correct async/await pattern, with type-safe inputs
 *   and response assertions using typia.assert
 * - Key relationships (user ids, thread id, post id) are asserted after each
 *   creation, ensuring entity linkage
 * - All test inputs adhere to minimal policy constraints for unique/secure
 *   values
 * - No extraneous steps or fictitious fields are introduced; the flow matches
 *   explicit business and technical requirements
 *
 * This test function is comprehensive for the core success case of
 * user-authenticated comment creation.
 */
export async function test_api_comment_creation_success_as_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "!Aa1";
  const displayName = RandomGenerator.name();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);
  const userId = userAuth.user.id;

  // 2. Create a discussion thread as this user
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals("thread created by user", thread.created_by_id, userId);

  // 3. Create a post in the thread
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 10,
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
  TestValidator.equals("post is in thread", post.thread_id, thread.id);
  TestValidator.equals("post authored by user", post.created_by_id, userId);

  // 4. User creates a comment on the post
  const commentBody = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 16,
  });
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: commentBody,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment is attached to post", comment.post_id, post.id);
  TestValidator.equals(
    "comment creator is user",
    comment.created_by_id,
    userId,
  );
  TestValidator.equals("comment body as submitted", comment.body, commentBody);
}
