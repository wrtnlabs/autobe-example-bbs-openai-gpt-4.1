import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test that an admin can upload and associate an attachment with any
 * comment—even if not the original author—bypassing member-level restrictions.
 *
 * This test ensures that when an admin uploads an attachment to a comment (not
 * their own), the attachment is correctly associated and audit trails reflect
 * the admin as the uploader, thus validating privilege bypass and integrity of
 * association/audit.
 *
 * Steps:
 *
 * 1. Register a board member as the comment author (admin-only provisioning).
 * 2. Create a comment as the new member (fabricated post ID for isolation).
 * 3. As admin, upload an attachment to that comment via the admin endpoint.
 * 4. Assert that:
 *
 *    - The attachment is linked to the target comment id.
 *    - The uploader_member_id is set to the admin's member id, not to the comment
 *         author's id.
 *    - Attachment metadata is correct (file name, url, MIME type, timestamps).
 *    - Audit information (uploaded_at) is present and valid ISO8601.
 *
 * Caveat:
 *
 * - Since there is no admin-member self-provisioning/lookup API here,
 *   adminMemberId is simulated randomly. In deployment, this should use the
 *   actual admin's member id from authentication context.
 */
export async function test_api_discussionBoard_test_create_comment_attachment_as_admin(
  connection: api.IConnection,
) {
  // 1. Register a member as a board user (comment author)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: typia.random<string>(),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Create a comment by the member (simulate a new post id)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: "Test comment as setup step.",
      },
    },
  );
  typia.assert(comment);

  // 3. Admin uploads an attachment to the member's comment
  const adminMemberId = typia.random<string & tags.Format<"uuid">>(); // Simulate admin member ID
  const fileName = "admin-uploaded-file.txt";
  const fileUrl = "https://cdn.example.com/files/admin-attachment.txt";
  const mimeType = "text/plain";
  const attachment =
    await api.functional.discussionBoard.admin.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: adminMemberId,
          file_name: fileName,
          file_url: fileUrl,
          mime_type: mimeType,
        },
      },
    );
  typia.assert(attachment);

  // 4. Assertions/validations
  TestValidator.equals("attachment linked to correct comment")(
    attachment.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("uploader is the admin")(attachment.uploader_member_id)(
    adminMemberId,
  );
  TestValidator.notEquals("uploader is not the comment author")(
    attachment.uploader_member_id,
  )(member.id);
  TestValidator.equals("file name matches")(attachment.file_name)(fileName);
  TestValidator.equals("file url matches")(attachment.file_url)(fileUrl);
  TestValidator.equals("mime type matches")(attachment.mime_type)(mimeType);
  TestValidator.predicate("uploaded_at is valid ISO8601")(
    !!Date.parse(attachment.uploaded_at),
  );
}
