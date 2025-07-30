import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test uploading a file attachment as a member to a non-existent commentId.
 *
 * This test ensures that the system enforces foreign key constraints by
 * preventing a member from uploading an attachment to a nonexistent comment. It
 * verifies that the API returns an error (such as 404 Not Found) and does not
 * allow the creation of orphaned attachments.
 *
 * Steps:
 *
 * 1. Create/register a new discussion board member (using the admin endpoint).
 * 2. Attempt to upload a comment attachment as that member to a
 *    randomly-generated, non-existent commentId.
 * 3. Confirm that the upload attempt fails with an error, ensuring referential
 *    integrity enforcement.
 */
export async function test_api_discussionBoard_member_comments_attachments_test_create_comment_attachment_for_invalid_comment(
  connection: api.IConnection,
) {
  // 1. Register a new board member (simulate authentication context)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: typia.random<string>(),
        joined_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(member);

  // 2. Generate a random UUID for a non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to create an attachment for this non-existent comment
  await TestValidator.error(
    "should fail to upload attachment to non-existent comment",
  )(async () => {
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: nonExistentCommentId,
        body: {
          discussion_board_comment_id: nonExistentCommentId,
          uploader_member_id: member.id,
          file_name: "file.txt",
          file_url: "https://file.example.com/testfile.txt",
          mime_type: "text/plain",
        },
      },
    );
  });
}
