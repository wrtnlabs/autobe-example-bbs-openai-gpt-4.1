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
 * E2E test for updating comment attachment metadata by the owner (user).
 *
 * Validates the use case where the original uploader edits the metadata of
 * an attachment on their own comment. The flow is:
 *
 * 1. Register a user (collects authentication and user context).
 * 2. User creates a discussion thread.
 * 3. User creates a post inside the thread.
 * 4. User creates a comment on that post.
 * 5. User uploads an attachment to the comment.
 * 6. User updates the attachment, modifying file_name and content_type fields
 *    only.
 * 7. Validates response: file_name/content_type changed;
 *    file_url/size_bytes/IDs/uploads unchanged.
 */
export async function test_api_comment_attachment_update_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Register the user
  const userInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(14) + "A!2",
    display_name: RandomGenerator.name(),
    consent: true,
  };
  const auth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(auth);
  const userId = auth.user.id;

  // 2. Create thread
  const threadInput: IDiscussionBoardThread.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    { body: threadInput },
  );
  typia.assert(thread);
  const threadId = thread.id;

  // 3. Create post in thread
  const postInput: IDiscussionBoardPost.ICreate = {
    thread_id: threadId,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  };
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    { threadId, body: postInput },
  );
  typia.assert(post);
  const postId = post.id;

  // 4. Create comment under post
  const commentInput: IDiscussionBoardComment.ICreate = {
    post_id: postId,
    body: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      { threadId, postId, body: commentInput },
    );
  typia.assert(comment);
  const commentId = comment.id;

  // 5. Upload initial attachment for comment
  const fileName = RandomGenerator.alphaNumeric(10) + ".txt";
  const attachmentInput: IDiscussionBoardAttachment.ICreate = {
    comment_id: commentId,
    file_name: fileName,
    file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(32)}.txt`,
    content_type: "text/plain",
    size_bytes: 4096,
  };
  const attachment =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.create(
      connection,
      { threadId, postId, commentId, body: attachmentInput },
    );
  typia.assert(attachment);
  const attachmentId = attachment.id;

  // 6. Prepare metadata update: change file_name and content_type
  const newFileName = RandomGenerator.alphaNumeric(8) + "_v2.txt";
  const newContentType = RandomGenerator.pick([
    "text/markdown",
    "application/octet-stream",
  ] as const);
  const updateInput: IDiscussionBoardAttachment.IUpdate = {
    file_name: newFileName,
    content_type: newContentType,
  };
  const updated =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.update(
      connection,
      { threadId, postId, commentId, attachmentId, body: updateInput },
    );
  typia.assert(updated);

  // 7. Validate result: only allowed fields are updated, IDs, file_url, size, uploader are unchanged
  TestValidator.equals("attachment ID constant", updated.id, attachment.id);
  TestValidator.equals(
    "comment ID constant",
    updated.comment_id,
    attachment.comment_id,
  );
  TestValidator.equals("uploader ID constant", updated.uploaded_by_id, userId);
  TestValidator.equals(
    "size_bytes constant",
    updated.size_bytes,
    attachment.size_bytes,
  );
  TestValidator.equals(
    "file_url constant",
    updated.file_url,
    attachment.file_url,
  );
  TestValidator.notEquals(
    "file_name updated",
    updated.file_name,
    attachment.file_name,
  );
  TestValidator.equals(
    "file_name equals update",
    updated.file_name,
    newFileName,
  );
  TestValidator.equals(
    "content_type equals update",
    updated.content_type,
    newContentType,
  );
  TestValidator.equals(
    "no change in deleted_at",
    updated.deleted_at,
    attachment.deleted_at,
  );
}
