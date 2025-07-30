import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate retrieval of metadata for a specific post attachment
 *
 * This test verifies that attachment metadata can be properly fetched for a
 * given post. It follows the workflow:
 *
 * 1. Create a new post in a randomly chosen thread (simulating a member creating
 *    content)
 * 2. Upload a new attachment associated with that post, getting back the
 *    attachment ID and all metadata
 * 3. Use the GET endpoint to fetch the attachment's metadata by postId and
 *    attachmentId
 * 4. Assert that all metadata fields returned by the GET endpoint match those
 *    returned at upload: filename, file URI, uploader, MIME type, and upload
 *    timestamp.
 *
 * This tests the full creation → retrieval lifecycle and ensures referential
 * integrity as well as metadata correctness.
 */
export async function test_api_discussionBoard_test_get_attachment_metadata_valid_attachment(
  connection: api.IConnection,
) {
  // 1. Create a new post on a random thread
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const createPostBody: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: threadId,
    body: RandomGenerator.content()()(),
  };
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: createPostBody,
    },
  );
  typia.assert(post);

  // 2. Upload an attachment to the created post
  const attachmentCreateBody: IDiscussionBoardPostAttachment.ICreate = {
    discussion_board_post_id: post.id,
    uploader_member_id: post.creator_member_id,
    file_uri: RandomGenerator.alphaNumeric(24),
    file_name: RandomGenerator.alphabets(10),
    mime_type: "image/png",
  };
  const attachment =
    await api.functional.discussionBoard.member.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // 3. Retrieve the attachment metadata
  const result = await api.functional.discussionBoard.posts.attachments.at(
    connection,
    {
      postId: post.id,
      attachmentId: attachment.id,
    },
  );
  typia.assert(result);

  // 4. Assert key metadata fields
  TestValidator.equals("discussion_board_post_id")(
    result.discussion_board_post_id,
  )(attachment.discussion_board_post_id);
  TestValidator.equals("uploader_member_id")(result.uploader_member_id)(
    attachment.uploader_member_id,
  );
  TestValidator.equals("file_uri")(result.file_uri)(attachment.file_uri);
  TestValidator.equals("file_name")(result.file_name)(attachment.file_name);
  TestValidator.equals("mime_type")(result.mime_type)(attachment.mime_type);
  TestValidator.equals("uploaded_at")(result.uploaded_at)(
    attachment.uploaded_at,
  );
}
