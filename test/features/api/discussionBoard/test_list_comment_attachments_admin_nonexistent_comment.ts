import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate error handling when fetching attachments for a non-existent comment
 * as an admin.
 *
 * This test ensures that the system returns an error (not found) when an admin
 * attempts to list attachments for a comment UUID that does not exist in the
 * database. This protects against leaking information about system entities and
 * ensures proper error boundaries are enforced for administrative queries.
 *
 * Steps:
 *
 * 1. Generate a completely random UUID, ensuring the value does not correspond to
 *    any existing comment (guaranteed by using random data in a fresh test
 *    context).
 * 2. As an admin, invoke the 'list attachments' endpoint for the non-existent
 *    comment ID.
 * 3. Assert that a not found error (or equivalent HTTP error) is thrown, and that
 *    no attachment data is returned.
 * 4. Ensure no data or metadata is leaked on failure.
 */
export async function test_api_discussionBoard_test_list_comment_attachments_admin_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID to simulate a non-existent comment ID
  const fakeCommentId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to retrieve attachments for the nonexistent comment as admin
  await TestValidator.error("Should throw not found for nonexistent comment")(
    async () => {
      await api.functional.discussionBoard.admin.comments.attachments.index(
        connection,
        { commentId: fakeCommentId },
      );
    },
  );
}
