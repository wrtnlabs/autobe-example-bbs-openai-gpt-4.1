import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Test public retrieval of attachment metadata from a discussion board
 * post.
 *
 * This test covers the following workflow:
 *
 * 1. User account registration as uploader/author.
 * 2. User creates a new thread.
 * 3. User creates a post in that thread.
 * 4. User uploads an attachment to the post, getting its metadata.
 * 5. Using an unauthenticated (no auth) API connection, retrieve metadata for
 *    uploaded attachment via its endpoint.
 * 6. Assert that all metadata fields are fully present and match what was
 *    uploaded, with compliance to DTO.
 * 7. Assert that this metadata is visible without authentication.
 */
export async function test_api_attachment_metadata_accessible(
  connection: api.IConnection,
) {
  // 1. User account registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "TestPassword123!";
  const displayName = RandomGenerator.name();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: username,
      password: password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);
  const userId = user.user.id;

  // 2. Create a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 8,
          wordMax: 18,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 10,
          wordMax: 18,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 12,
          sentenceMax: 20,
          wordMin: 6,
          wordMax: 14,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Upload a new attachment to the post
  const uploadedAttachment =
    await api.functional.discussionBoard.user.threads.posts.attachments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          file_name: "test_image.png",
          file_url: `https://files.example.com/${RandomGenerator.alphaNumeric(12)}.png`,
          content_type: "image/png",
          size_bytes: 36048,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(uploadedAttachment);

  // 5. Retrieve metadata as unauthenticated (public) client
  const publicConnection: api.IConnection = { ...connection, headers: {} };
  const attachmentMeta =
    await api.functional.discussionBoard.threads.posts.attachments.at(
      publicConnection,
      {
        threadId: thread.id,
        postId: post.id,
        attachmentId: uploadedAttachment.id,
      },
    );
  typia.assert(attachmentMeta);

  // 6. Assert metadata fields match expectations (publicly readable)
  TestValidator.equals(
    "attachment id matches",
    attachmentMeta.id,
    uploadedAttachment.id,
  );
  TestValidator.equals(
    "attachment post_id matches",
    attachmentMeta.post_id,
    uploadedAttachment.post_id,
  );
  TestValidator.equals(
    "attachment uploaded_by_id matches",
    attachmentMeta.uploaded_by_id,
    userId,
  );
  TestValidator.equals(
    "attachment file_name matches",
    attachmentMeta.file_name,
    uploadedAttachment.file_name,
  );
  TestValidator.equals(
    "attachment file_url matches",
    attachmentMeta.file_url,
    uploadedAttachment.file_url,
  );
  TestValidator.equals(
    "attachment content_type matches",
    attachmentMeta.content_type,
    uploadedAttachment.content_type,
  );
  TestValidator.equals(
    "attachment size_bytes matches",
    attachmentMeta.size_bytes,
    uploadedAttachment.size_bytes,
  );
  TestValidator.equals(
    "attachment is not soft-deleted",
    attachmentMeta.deleted_at,
    null,
  );
  TestValidator.predicate(
    "attachment created_at is present",
    typeof attachmentMeta.created_at === "string" &&
      attachmentMeta.created_at.length > 0,
  );
}
