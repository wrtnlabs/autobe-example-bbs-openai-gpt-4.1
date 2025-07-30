import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test error handling when a member tries to list attachments for a
 * non-existent commentId (404 not found).
 *
 * This test validates that the API responds with an appropriate error when
 * requesting comment attachments for a comment ID that does not exist in the
 * system. It simulates a common error scenario where a user might access or
 * mistype an ID, and is important for user experience and system security.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is extremely unlikely to exist as a commentId.
 * 2. As a (potentially unprivileged) member, call the API to list comment
 *    attachments using this commentId.
 * 3. Assert that a not found/404 error occurs (TestValidator.error), indicating
 *    that the system properly guards against listing attachments for
 *    non-existent discussion comments.
 */
export async function test_api_discussionBoard_test_list_comment_attachments_as_member_for_nonexistent_comment(
  connection: api.IConnection,
) {
  // Step 1: Generate a random UUID for a non-existent commentId
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 2 & 3: Attempt to list attachments and assert that a not found error is thrown
  await TestValidator.error(
    "Should throw not found error for invalid commentId",
  )(async () => {
    await api.functional.discussionBoard.member.comments.attachments.index(
      connection,
      {
        commentId: invalidCommentId,
      },
    );
  });
}
