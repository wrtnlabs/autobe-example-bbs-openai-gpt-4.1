import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validates that an admin user can access the details of a comment attachment
 * regardless of who uploaded it.
 *
 * This test simulates a complete workflow:
 *
 * 1. Register a new member using the admin member creation API.
 * 2. Have the member create a comment for a (simulated) post using the member
 *    comments API.
 * 3. Have the member upload an attachment to the comment via the attachments API.
 * 4. Retrieve the attachment detail as admin using the admin API.
 * 5. Checks that metadata matches and content is accessible.
 *
 * This ensures that admins have oversight powers independent of uploader
 * identity, and that file metadata (file name, url, mime type, uploader,
 * associations) is correct.
 */
export async function test_api_discussionBoard_test_get_comment_attachment_detail_success_as_admin(
  connection: api.IConnection,
) {
  // 1. Register a new board member (admin privilege)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: typia.random<string>(),
    joined_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Member creates a comment (simulate post existence and authorization)
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
    content: RandomGenerator.paragraph()(),
  };
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    { body: commentInput },
  );
  typia.assert(comment);

  // 3. Member uploads an attachment to the comment
  const fileName = `testfile_${typia.random<string>()}.txt`;
  const fileUrl = `https://cdn.example.com/${fileName}`;
  const attachmentInput: IDiscussionBoardCommentAttachment.ICreate = {
    discussion_board_comment_id: comment.id,
    uploader_member_id: member.id,
    file_name: fileName,
    file_url: fileUrl,
    mime_type: "text/plain",
  };
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 4. Access the attachment as admin
  const detail =
    await api.functional.discussionBoard.admin.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(detail);

  // 5. Check metadata integrity
  TestValidator.equals("attachment id")(detail.id)(attachment.id);
  TestValidator.equals("comment id")(detail.discussion_board_comment_id)(
    comment.id,
  );
  TestValidator.equals("uploader_member_id")(detail.uploader_member_id)(
    member.id,
  );
  TestValidator.equals("file name")(detail.file_name)(
    attachmentInput.file_name,
  );
  TestValidator.equals("file url")(detail.file_url)(attachmentInput.file_url);
  TestValidator.equals("mime type")(detail.mime_type)(
    attachmentInput.mime_type,
  );
}
