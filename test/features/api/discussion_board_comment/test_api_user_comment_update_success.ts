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
 * Validates that a user can successfully update their own comment on a
 * post.
 *
 * Business context: Users are expected to be able to edit their own
 * comments per forum policy. Comment editing must respect authentication
 * and edit permissions, and all edit actions must be traceable for audit.
 *
 * Step-by-step process:
 *
 * 1. Register and authenticate a new user (prerequisite for comment creation).
 * 2. Create a thread as the authenticated user.
 * 3. Create a post within the thread as the user.
 * 4. Add a new comment to the post (initial content).
 * 5. Update the comment using the update endpoint with new content.
 * 6. Confirm the API response:
 *
 *    - Comment content is updated as requested
 *    - The comment id, parentage, and author remain unchanged
 *    - The updated_at timestamp is newer post-update
 *    - The response matches the DTO expectations
 *    - No extraneous or missing relation fields (post/thread linkage preserved)
 *    - Future: If edit history is exposed, assert an appended audit record
 */
export async function test_api_user_comment_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "!A1";
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
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post in that thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 18,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Add a new comment to the post
  const initialCommentBody = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
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
          body: initialCommentBody,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Update the comment
  const updatedCommentBody = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 4,
    wordMax: 14,
  });
  const updated =
    await api.functional.discussionBoard.user.threads.posts.comments.update(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        body: {
          body: updatedCommentBody,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updated);

  // 6. Confirm response correctness
  TestValidator.equals("comment id unchanged", updated.id, comment.id);
  TestValidator.equals("post_id unchanged", updated.post_id, comment.post_id);
  TestValidator.equals(
    "created_by_id unchanged",
    updated.created_by_id,
    comment.created_by_id,
  );
  TestValidator.notEquals("body is updated", updated.body, comment.body);
  TestValidator.predicate(
    "updated_at after initial create",
    new Date(updated.updated_at) > new Date(comment.updated_at),
  );
  TestValidator.predicate(
    "updated body matches input",
    updated.body === updatedCommentBody,
  );
  TestValidator.equals(
    "nesting level unchanged",
    updated.nesting_level,
    comment.nesting_level,
  );
  TestValidator.equals("no delete timestamp", updated.deleted_at, null);
}
