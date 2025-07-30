import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validate that updating a comment version with an invalid commentId or
 * versionId as an admin returns the expected not found errors.
 *
 * This test covers the case where an administrative user attempts to edit a
 * version record of a discussion comment using deliberately incorrect IDs. The
 * purpose is to verify that:
 *
 * 1. The endpoint responds with a 404 (not found) style error when a non-existent
 *    commentId is provided.
 * 2. The endpoint responds with a 404 (not found) style error when a valid
 *    commentId is given, but the versionId does not exist (or does not belong
 *    to that comment).
 *
 * Steps:
 *
 * 1. Attempt to update a comment version using random non-existent UUIDs for both
 *    commentId and versionId.
 *
 *    - Expect a not found error.
 * 2. (Optional: would be covered if creation endpoints existed) Try updating a
 *    valid comment ID with an invalid versionId.
 *
 * Note: Further negative scenarios (such as only versionId wrong but commentId
 * valid) are not implemented here due to absence of creation APIs in the
 * provided function set.
 */
export async function test_api_discussionBoard_test_update_comment_version_as_admin_invalid_reference(
  connection: api.IConnection,
) {
  // Step 1: Attempt to update a comment version using both invalid commentId and versionId
  await TestValidator.error(
    "invalid commentId/versionId should return not found error",
  )(() =>
    api.functional.discussionBoard.admin.comments.versions.update(connection, {
      commentId: typia.random<string & tags.Format<"uuid">>(),
      versionId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        content: "Moderation edit attempt with bad references",
      } satisfies IDiscussionBoardCommentVersion.IUpdate,
    }),
  );

  // Additional not-found edge cases relying on pre-existing or creatable data are not feasible with the provided functions only.
}
