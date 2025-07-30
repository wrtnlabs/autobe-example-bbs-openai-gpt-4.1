import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that even admin users cannot upload restricted file types as comment
 * attachments.
 *
 * This test ensures that security/content validation is enforced for attachment
 * file types, even for admin users. Attempt to upload a restricted file type as
 * an admin should be rejected, returning an error response.
 *
 * Steps:
 *
 * 1. Admin creates a new board member (dependency) to have a valid member for
 *    comment creation.
 * 2. Member creates a valid comment under a post (dependency) - using random uuid
 *    as post id.
 * 3. Admin attempts to upload a prohibited attachment type (e.g., .exe file or
 *    application/x-msdownload) to the created comment.
 * 4. Validate that the request fails, confirming that an error (rejection) occurs
 *    and no attachment is created.
 */
export async function test_api_discussionBoard_test_create_comment_attachment_as_admin_invalid_filetype(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member as admin
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a valid comment under a post as that member (simulate valid post id)
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(2),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Attempt to upload a restricted file type attachment as admin
  await TestValidator.error("admin cannot upload restricted filetype")(
    async () => {
      await api.functional.discussionBoard.admin.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: {
            discussion_board_comment_id: comment.id,
            uploader_member_id: member.id,
            file_name: "malicious.exe",
            file_url: "https://evil.cdn/malware.exe",
            mime_type: "application/x-msdownload",
          } satisfies IDiscussionBoardCommentAttachment.ICreate,
        },
      );
    },
  );
}
