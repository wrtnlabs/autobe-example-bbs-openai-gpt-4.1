import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test moderator's attempt to upload an attachment to a non-existent comment.
 *
 * This scenario ensures that even moderator roles cannot attach files to
 * comments that do not exist. It verifies the backend strictly enforces comment
 * existence as a parent for attachments.
 *
 * The test tries to upload a file by providing a random (guaranteed
 * non-existent) commentId. The expected behavior is a runtime error (such as
 * HTTP 404 Not Found or similar business error) indicating the parent comment
 * was not found. Any acceptance of the upload indicates a critical bug in
 * reference integrity enforcement.
 *
 * Workflow:
 *
 * 1. Construct a random UUID for commentId that cannot correspond to an actual
 *    comment (no prior comment creation step).
 * 2. Prepare attachment upload input with random but valid-looking data for a
 *    file, specifying the above non-existent commentId as parent.
 * 3. Call the API as a moderator, attempting the upload.
 * 4. Assert that an error is thrown due to missing parent comment (error catch
 *    block/test validator).
 */
export async function test_api_discussionBoard_test_create_comment_attachment_as_moderator_on_nonexistent_comment(
  connection: api.IConnection,
) {
  // Step 1: Prepare a random non-existent comment ID (UUID format)
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Build upload request body. Use valid dummy data, but reference the non-existent commentId
  const uploaderMemberId = typia.random<string & tags.Format<"uuid">>();
  const fileName = `testfile_${Date.now()}.jpg`;
  const fileUrl = `https://cdn.example.com/fakepath/${Date.now()}_sample.jpg`;
  const mimeType = "image/jpeg";
  const input: IDiscussionBoardCommentAttachment.ICreate = {
    discussion_board_comment_id: nonExistentCommentId,
    uploader_member_id: uploaderMemberId,
    file_name: fileName,
    file_url: fileUrl,
    mime_type: mimeType,
  };

  // Step 3: Attempt the upload, expecting an error (not found)
  await TestValidator.error("Upload should fail due to missing parent comment")(
    async () => {
      await api.functional.discussionBoard.moderator.comments.attachments.create(
        connection,
        {
          commentId: nonExistentCommentId,
          body: input,
        },
      );
    },
  );
}
