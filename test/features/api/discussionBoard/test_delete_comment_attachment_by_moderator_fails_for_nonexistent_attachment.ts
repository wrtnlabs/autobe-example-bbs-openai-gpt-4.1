import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate moderator receives proper error when deleting a non-existent comment
 * attachment.
 *
 * This test verifies the API returns an appropriate not-found (or equivalent)
 * error when a moderator attempts to delete a comment attachment using IDs that
 * do not exist. It ensures system robustness in error handling, preventing
 * accidental deletion and returning clear feedback on invalid resource
 * requests.
 *
 * Steps:
 *
 * 1. Create (authenticate) a moderator for permission context.
 * 2. Attempt to delete an attachment on a random (non-existent) commentId and
 *    attachmentId.
 * 3. Assert that an error is thrown (not-found or similar), confirming correct
 *    error path handling and that no non-existent resources can be deleted.
 */
export async function test_api_discussionBoard_test_delete_comment_attachment_by_moderator_fails_for_nonexistent_attachment(
  connection: api.IConnection,
) {
  // 1. Create moderator (for permission)
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        granted_at: new Date().toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Attempt to delete an attachment with non-existent IDs
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Validate that delete fails with not-found (or similar) error
  await TestValidator.error(
    "delete non-existent attachment should throw error",
  )(async () => {
    await api.functional.discussionBoard.moderator.comments.attachments.erase(
      connection,
      {
        commentId: fakeCommentId,
        attachmentId: fakeAttachmentId,
      },
    );
  });
}
