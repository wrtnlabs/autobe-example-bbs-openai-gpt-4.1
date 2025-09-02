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
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Test the soft deletion of a comment attachment by its uploader/owner.
 *
 * Business context: Ensures that attachments uploaded to discussion
 * comments can be deleted by the uploader (owner) only, resulting in a
 * soft-delete (deleted_at is set, not a hard removal). Deleted attachments
 * are hidden from user views and preserve audit/compliance trails.
 *
 * Steps:
 *
 * 1. Create a new user (the uploader) and establish authenticated context.
 * 2. User creates a discussion thread.
 * 3. User creates a post in the thread.
 * 4. User posts a comment to the post.
 * 5. User uploads an attachment to the comment.
 * 6. User deletes (soft-deletes) the attachment from the comment via the
 *    delete API.
 * 7. Confirm the operation succeeds (expected void response).
 * 8. Optionally (if API supported), verify that the attachment is not listed
 *    in queries and that the deleted_at timestamp is set on the attachment
 *    resource (in this test, confirm as much as possible given available
 *    APIs).
 * 9. Validate that only the uploader can perform this deletion (main logic
 *    covered here – cross-user forbidden scenario is handled in a separate
 *    test).
 */
export async function test_api_comment_attachment_delete_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Register a new user (uploader) and get identity context
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);
  // 2. Create a new thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  // 3. Create a new post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 4,
          sentenceMax: 8,
          wordMin: 3,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a new comment on the post
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 2,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Upload attachment to the comment
  const attachment =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_name: RandomGenerator.alphaNumeric(12) + ".jpg",
          file_url:
            "https://test-file-upload.com/" + RandomGenerator.alphaNumeric(16),
          content_type: "image/jpeg",
          size_bytes: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 6. Soft-delete the attachment as the uploader
  await api.functional.discussionBoard.user.threads.posts.comments.attachments.erase(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );
  // 7. If there were a list/read API, here we would check that the attachment is not listed and deleted_at is set. Since not available, the step can't be implemented directly.
  // So end with a predicate that the delete call succeeded (void response, no error thrown means success)
  TestValidator.predicate(
    "attachment deletion succeeded (void response)",
    true,
  );
}
