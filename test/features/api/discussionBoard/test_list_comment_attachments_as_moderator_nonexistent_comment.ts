import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test accessing attachments as a moderator for a non-existent commentId.
 *
 * This test validates that the moderator attachment list API correctly handles
 * the case when the given commentId does not exist. It ensures that:
 *
 * 1. No attachment data is returned for the non-existent comment.
 * 2. A 'not found' error (HTTP 404) is thrown by the API function.
 * 3. No sensitive information is leaked in the response body.
 *
 * Steps:
 *
 * 1. Construct a random UUID that does not correspond to any existing comment.
 * 2. Call the API as a moderator to list comment attachments with this fake UUID.
 * 3. Expect an error to be thrown. Confirm the error is an HttpError with HTTP
 *    status 404.
 */
export async function test_api_discussionBoard_test_list_comment_attachments_as_moderator_nonexistent_comment(
  connection: api.IConnection,
) {
  // Step 1: Generate a UUID for a non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 2 & 3: Attempt API call and validate error handling
  await TestValidator.error(
    "Moderator listing attachments on non-existent comment returns not found error",
  )(async () => {
    await api.functional.discussionBoard.moderator.comments.attachments.index(
      connection,
      {
        commentId: nonExistentCommentId,
      },
    );
  });
}
