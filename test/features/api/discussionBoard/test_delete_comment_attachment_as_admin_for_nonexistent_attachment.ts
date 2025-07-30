import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that the admin cannot delete a nonexistent comment attachment.
 *
 * This test confirms that the API correctly handles error conditions when an
 * admin attempts to remove a comment attachment using random UUIDs that do not
 * correspond to any real comment or attachment in the system.
 *
 * Steps:
 *
 * 1. Generate random UUIDs to represent the comment ID and attachment ID, ensuring
 *    there is no real record corresponding to them.
 * 2. Attempt to call the admin comment attachment deletion endpoint with these
 *    IDs.
 * 3. Validate that the operation fails, confirming that an error/not found
 *    response is returned.
 * 4. No resources should be removed and the error should clearly indicate the
 *    nonexistent resource.
 */
export async function test_api_discussionBoard_test_delete_comment_attachment_as_admin_for_nonexistent_attachment(
  connection: api.IConnection,
) {
  // 1. Generate random UUIDs to act as nonexistent commentId and attachmentId
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  const randomAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt the DELETE operation as admin for nonexistent attachment
  await TestValidator.error(
    "admin cannot delete nonexistent comment attachment",
  )(async () => {
    await api.functional.discussionBoard.admin.comments.attachments.erase(
      connection,
      {
        commentId: randomCommentId,
        attachmentId: randomAttachmentId,
      },
    );
  });
}
