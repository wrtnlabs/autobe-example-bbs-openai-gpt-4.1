import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate API rejection when attempting to upload a discussion board post
 * attachment with a prohibited file type or MIME type.
 *
 * This test ensures that business rules around allowed file extensions and MIME
 * types for discussion board post attachments are enforced. The system must
 * prevent the upload of attachments with file types or content types not
 * explicitly permitted (e.g., ".exe", "application/x-msdownload"). This
 * safeguards against the upload of malware or unwanted content.
 *
 * Steps:
 *
 * 1. Set up: Create a minimal post (assuming a thread exists and the necessary
 *    authentication context is present).
 * 2. Attempt: Try to upload an attachment to the post using an unsupported file
 *    extension (e.g., ".exe") and MIME type (e.g.,
 *    "application/x-msdownload").
 * 3. Validation: Confirm that the API call fails, and an error is produced
 *    indicating the file type or MIME is not allowed, as per the file
 *    validation business rules.
 */
export async function test_api_discussionBoard_test_create_post_attachment_with_invalid_file_type(
  connection: api.IConnection,
) {
  // 1. Prepare test post via post creation dependency
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        discussion_board_thread_id: threadId,
        body: "Initial post for attachment testing",
      },
    },
  );
  typia.assert(post);

  // 2. Attempt to upload an attachment with illegal file type/MIME
  // Simulate invalid file extension and forbidden MIME type
  const invalidAttachment = {
    discussion_board_post_id: post.id,
    uploader_member_id: post.creator_member_id,
    file_uri: "https://cdn.example.com/uploads/test-virus.exe",
    file_name: "test-virus.exe",
    mime_type: "application/x-msdownload",
  } satisfies IDiscussionBoardPostAttachment.ICreate;

  await TestValidator.error(
    "Should fail for disallowed file type or MIME type",
  )(() =>
    api.functional.discussionBoard.member.posts.attachments.create(connection, {
      postId: post.id,
      body: invalidAttachment,
    }),
  );
}
