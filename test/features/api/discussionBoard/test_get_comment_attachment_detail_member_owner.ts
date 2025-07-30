import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that a comment owner can retrieve full metadata details for a
 * specific attachment on their comment.
 *
 * Ensures that after uploading an attachment to their own comment, the member
 * can retrieve accurate, complete metadata including file URI, file name, MIME
 * type, uploader ID, and upload timestamp. This test covers only the successful
 * retrieval path (owner member).
 *
 * Steps:
 *
 * 1. Create a new comment as a (randomized) member under a (randomized) post
 * 2. Upload a file attachment to the new comment as the member
 * 3. Retrieve the attachment metadata as the comment owner
 * 4. Validate that all returned metadata fields match what was stored upon upload
 */
export async function test_api_discussionBoard_test_get_comment_attachment_detail_member_owner(
  connection: api.IConnection,
) {
  // 1. Create random UUIDs for member and parent post
  const discussion_board_member_id = typia.random<
    string & tags.Format<"uuid">
  >();
  const discussion_board_post_id = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a new comment as the member
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id,
        discussion_board_post_id,
        content: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(comment);
  TestValidator.equals("member ID matches")(comment.discussion_board_member_id)(
    discussion_board_member_id,
  );
  TestValidator.equals("parent post ID matches")(
    comment.discussion_board_post_id,
  )(discussion_board_post_id);

  // 3. Upload an attachment to the created comment
  const file_name = RandomGenerator.alphaNumeric(10);
  const file_url = `https://files.example.com/${RandomGenerator.alphaNumeric(20)}`;
  const mime_type = "image/png";
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: discussion_board_member_id,
          file_name,
          file_url,
          mime_type,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals("comment ID matches")(
    attachment.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("uploader matches")(attachment.uploader_member_id)(
    discussion_board_member_id,
  );
  TestValidator.equals("file name matches")(attachment.file_name)(file_name);
  TestValidator.equals("file URL matches")(attachment.file_url)(file_url);
  TestValidator.equals("MIME type matches")(attachment.mime_type)(mime_type);

  // 4. Retrieve and validate the attachment metadata via GET
  const output =
    await api.functional.discussionBoard.member.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(output);
  TestValidator.equals("attachment ID matches")(output.id)(attachment.id);
  TestValidator.equals("comment ID matches")(
    output.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("uploader matches")(output.uploader_member_id)(
    discussion_board_member_id,
  );
  TestValidator.equals("file name matches")(output.file_name)(file_name);
  TestValidator.equals("file URL matches")(output.file_url)(file_url);
  TestValidator.equals("MIME type matches")(output.mime_type)(mime_type);
  typia.assert<string & tags.Format<"date-time">>(output.uploaded_at);
}
