import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate admin behavior when uploading an attachment to a non-existent
 * comment.
 *
 * This test ensures that the discussion board admin API enforces referential
 * integrity when uploading attachments, even for admin users. An admin attempts
 * to upload an attachment (with all required metadata) to a commentId that does
 * not exist in the system.
 *
 * Steps:
 *
 * 1. Generate a random UUID as a (non-existent) commentId.
 * 2. Call the admin attachment upload API, passing valid attachment data referring
 *    to this random (non-existent) commentId in both the path and request
 *    body.
 * 3. Verify that the API returns an error (such as not found) indicating the
 *    comment does not exist, guaranteeing referential checks on the API side
 *    regardless of admin privileges.
 */
export async function test_api_discussionBoard_test_create_comment_attachment_as_admin_to_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a non-existent commentId
  const fakeCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare the attachment creation request body using the same fake commentId
  const adminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fileName = "testfile.txt";
  const fileUrl = "https://cdn.example.com/testfile.txt";
  const mimeType = "text/plain";

  const createInput: IDiscussionBoardCommentAttachment.ICreate = {
    discussion_board_comment_id: fakeCommentId,
    uploader_member_id: adminId,
    file_name: fileName,
    file_url: fileUrl,
    mime_type: mimeType,
  };

  // 3. Attempt to call the admin API and check that it returns an error (e.g., not found)
  await TestValidator.error("Should fail for non-existent commentId")(
    async () => {
      await api.functional.discussionBoard.admin.comments.attachments.create(
        connection,
        {
          commentId: fakeCommentId,
          body: createInput,
        },
      );
    },
  );
}
