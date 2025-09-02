import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Verifies that a post author (authenticated user) can update their own
 * post's content or title.
 *
 * Business context: Ownership authorization is required for modification of
 * posts—users can only update posts they own. This test ensures that after
 * registration and normal post creation, the same user (context) is able to
 * update the post, and the API returns the new values as expected.
 *
 * Step-by-step process:
 *
 * 1. Register a new user for authentication.
 * 2. Create a discussion thread as the user.
 * 3. Create a post as the user under their thread.
 * 4. Update (PUT) the created post with new title and/or body.
 * 5. Validate that update is reflected (fields are changed as intended, other
 *    fields are unchanged, author/thread relationships are correct).
 *
 * Note: This test assumes the API server updates the 'updated_at' timestamp
 * with sufficient granularity that even a fast test run will see a
 * difference.
 */
export async function test_api_post_update_success_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user (as post owner)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "A!";
  const displayName = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);
  // 2. Create a thread
  const threadTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 10,
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
  // 3. Create a post in the thread
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 12,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 15,
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
  // 4. Update the post as the owner (authenticated user)
  let newTitle: string;
  let newBody: string;
  do {
    newTitle = RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 14,
    });
  } while (newTitle === postTitle);
  do {
    newBody = RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 18,
      wordMin: 4,
      wordMax: 9,
    });
  } while (newBody === postBody);
  const updatedPost =
    await api.functional.discussionBoard.user.threads.posts.update(connection, {
      threadId: thread.id,
      postId: post.id,
      body: {
        title: newTitle,
        body: newBody,
      } satisfies IDiscussionBoardPost.IUpdate,
    });
  typia.assert(updatedPost);
  // 5. Validate update
  TestValidator.equals(
    "post id remains the same after update",
    updatedPost.id,
    post.id,
  );
  TestValidator.equals(
    "thread id remains the same after update",
    updatedPost.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "author id remains unchanged after update",
    updatedPost.created_by_id,
    post.created_by_id,
  );
  TestValidator.equals(
    "created_at unchanged after update",
    updatedPost.created_at,
    post.created_at,
  );
  TestValidator.equals("title is updated", updatedPost.title, newTitle);
  TestValidator.notEquals(
    "title actually changes on update",
    updatedPost.title,
    post.title,
  );
  TestValidator.equals("body is updated", updatedPost.body, newBody);
  TestValidator.notEquals(
    "body actually changes on update",
    updatedPost.body,
    post.body,
  );
  TestValidator.notEquals(
    "updated_at changes after update",
    updatedPost.updated_at,
    post.updated_at,
  );
  TestValidator.equals(
    "lock state does not change on update",
    updatedPost.is_locked,
    post.is_locked,
  );
  // deleted_at should remain unchanged
  TestValidator.equals(
    "deleted_at remains unchanged",
    updatedPost.deleted_at,
    post.deleted_at,
  );
}
