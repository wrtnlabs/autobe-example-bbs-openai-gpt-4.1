import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that updating a non-existent comment attachment as admin returns a
 * not found error.
 *
 * Business Context: Admins have the ability to update (edit) the metadata of
 * comment attachments in the discussion board. If an admin attempts to update
 * an attachment that does not exist (for example, by providing invalid UUIDs
 * for either the comment or the attachment), the system should respond with a
 * not found error rather than modifying any data or succeeding silently.
 *
 * Test Steps:
 *
 * 1. Create an admin user, as only admins are allowed to attempt this update
 *    operation.
 * 2. Using the admin, attempt to update a comment attachment using randomly
 *    generated (non-existent) UUIDs for both commentId and attachmentId, with
 *    some sample metadata in the update body.
 * 3. The SDK call should result in an error being thrown. Confirm that the error
 *    occurs (not found condition), using TestValidator.error.
 *
 * This test ensures that privilege escalation or invalid access is not possible
 * through non-existent resource IDs, and that error handling is in place for
 * not found conditions.
 */
export async function test_api_discussionBoard_test_update_comment_attachment_by_admin_fails_for_nonexistent_attachment(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const adminUserIdentifier = RandomGenerator.alphaNumeric(12);
  await api.functional.discussionBoard.admin.admins.create(connection, {
    body: {
      user_identifier: adminUserIdentifier,
      granted_at: new Date().toISOString(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });

  // 2. Try to update a non-existent comment attachment as admin (random UUIDs)
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IDiscussionBoardCommentAttachment.IUpdate = {
    file_name: "updated_file.pdf",
    file_url: "https://cdn.example.com/updated_file.pdf",
    mime_type: "application/pdf",
  };

  TestValidator.error("should fail with not found for non-existent attachment")(
    async () => {
      await api.functional.discussionBoard.admin.comments.attachments.update(
        connection,
        {
          commentId: fakeCommentId,
          attachmentId: fakeAttachmentId,
          body: updateBody,
        },
      );
    },
  );
}
