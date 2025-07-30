import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validates successful creation and linkage of an attachment to a discussion
 * board post.
 *
 * This test creates a thread ID (as thread creation is not available in covered
 * APIs), then creates a new post under that thread, and uploads a file
 * attachment to that post via the POST
 * /discussionBoard/member/posts/{postId}/attachments endpoint.
 *
 * The test verifies:
 *
 * - The response contains accurate file metadata (URI, name, MIME type, uploader)
 * - The attachment is correctly linked to the target post and posting member
 * - Timestamps follow the expected format
 *
 * Steps:
 *
 * 1. Generate a random thread UUID to represent the discussion thread
 * 2. Create a post in that thread as a member
 * 3. Upload a file attachment (with valid URI, name, and MIME type) to the post
 * 4. Assert response contains all required metadata and is linked correctly to the
 *    post and member
 * 5. (Edge) Permission enforcement error tests are omitted due to unavailable
 *    unauthenticated call context/API functions.
 */
export async function test_api_discussionBoard_test_create_post_attachment_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Generate a thread UUID (simulate a thread that exists)
  const threadId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a post under this thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        discussion_board_thread_id: threadId,
        body: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Upload a file attachment to the post
  const fileUri = `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}`;
  const fileName = `${RandomGenerator.alphaNumeric(8)}.png`;
  const mimeType = "image/png";

  const attachment =
    await api.functional.discussionBoard.member.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          uploader_member_id: post.creator_member_id,
          file_uri: fileUri,
          file_name: fileName,
          mime_type: mimeType,
        } satisfies IDiscussionBoardPostAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Assert linkage and all returned metadata
  TestValidator.equals("attachment linked to post")(
    attachment.discussion_board_post_id,
  )(post.id);
  TestValidator.equals("uploader matches post creator")(
    attachment.uploader_member_id,
  )(post.creator_member_id);
  TestValidator.equals("file uri matches")(attachment.file_uri)(fileUri);
  TestValidator.equals("file name matches")(attachment.file_name)(fileName);
  TestValidator.equals("mime type matches")(attachment.mime_type)(mimeType);
  TestValidator.predicate("uploaded_at is ISO date-time format")(
    !Number.isNaN(Date.parse(attachment.uploaded_at)),
  );
}
