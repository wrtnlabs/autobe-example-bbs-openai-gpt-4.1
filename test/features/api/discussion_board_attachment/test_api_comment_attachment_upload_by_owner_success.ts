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
 * Test successful upload of a new attachment by comment author.
 *
 * Scenario steps:
 *
 * 1. Register a new user via join (with random email/username/password,
 *    consent=true)
 * 2. As this user, create a discussion thread
 * 3. As this user, create a post in the new thread
 * 4. As this user, create a comment in the new post
 * 5. Upload a valid attachment (file) to the comment as comment author
 * 6. Validate the attachment is returned with proper metadata and correct
 *    parent association
 * 7. Validate API response structure and data types for integrity (id,
 *    uploader, filenames, comment_id, etc.)
 */
export async function test_api_comment_attachment_upload_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password: RandomGenerator.alphaNumeric(12) + "A1!",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. Create a discussion thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals(
    "thread creator is user",
    thread.created_by_id,
    userAuth.user.id,
  );

  // 3. Create a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post's thread matches", post.thread_id, thread.id);
  TestValidator.equals(
    "post created by user",
    post.created_by_id,
    userAuth.user.id,
  );

  // 4. Create a comment on the post
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 3 }),
          // parent_id omitted (top-level comment)
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment created by user",
    comment.created_by_id,
    userAuth.user.id,
  );
  TestValidator.equals("comment post matches", comment.post_id, post.id);

  // 5. Upload a valid attachment to the comment
  const fileName = RandomGenerator.alphaNumeric(8) + ".png";
  const contentType = "image/png";
  const sizeBytes = 50000;
  const fileUrl = `https://files.example.com/discussion/${RandomGenerator.alphaNumeric(16)}.png`;

  const attachment =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_name: fileName,
          file_url: fileUrl,
          content_type: contentType,
          size_bytes: sizeBytes,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 6. Validate response: association and metadata
  TestValidator.equals(
    "attachment belongs to comment",
    attachment.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "attachment uploaded by correct user",
    attachment.uploaded_by_id,
    userAuth.user.id,
  );
  TestValidator.equals(
    "attachment file name matches",
    attachment.file_name,
    fileName,
  );
  TestValidator.equals(
    "attachment MIME type matches",
    attachment.content_type,
    contentType,
  );
  TestValidator.equals(
    "attachment file size matches",
    attachment.size_bytes,
    sizeBytes,
  );
  TestValidator.predicate(
    "attachment has valid id",
    typeof attachment.id === "string" && attachment.id.length > 0,
  );
  TestValidator.predicate(
    "attachment has valid URL",
    typeof attachment.file_url === "string" && attachment.file_url.length > 0,
  );
  TestValidator.equals(
    "attachment is not linked to a post directly",
    attachment.post_id,
    null,
  );
  TestValidator.predicate(
    "attachment created_at is ISO string",
    typeof attachment.created_at === "string" &&
      !isNaN(Date.parse(attachment.created_at)),
  );
}
