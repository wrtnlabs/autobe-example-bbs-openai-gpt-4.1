import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for admin soft-deleting a poll attached to a post.
 *
 * Validates that an admin can perform a soft-deletion (set deleted_at) on a
 * poll. This test does the following:
 *
 * 1. Registers and authenticates an admin via /auth/admin/join, ensuring admin
 *    capability for subsequent steps.
 * 2. Uses simulated/random postId and pollId values for deletion, since no
 *    create endpoints are available.
 * 3. Requests deletion via DELETE
 *    /discussionBoard/admin/posts/{postId}/polls/{pollId} and expects the
 *    API to succeed (no error thrown, returns void).
 * 4. Attempts a second deletion of the same poll, expecting an error (the API
 *    endpoint docs specify that a business error is thrown for
 *    already-deleted polls). Uses TestValidator.error to assert error is
 *    thrown.
 *
 * Limitations: Cannot validate the deleted_at field or exclusion from
 * listings, as read/query/list endpoints are not available in this scope.
 */
export async function test_api_poll_soft_delete_success_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminResp = await api.functional.auth.admin.join(connection, {
    body: typia.random<IDiscussionBoardAdmin.ICreate>(),
  });
  typia.assert(adminResp);

  // 2. Simulate poll and post IDs (since creation isn't supported here)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const pollId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete poll as admin
  await api.functional.discussionBoard.admin.posts.polls.erase(connection, {
    postId,
    pollId,
  });

  // 4. Second delete should throw (business error for already deleted poll)
  await TestValidator.error(
    "Deleting already-deleted poll should throw error",
    async () => {
      await api.functional.discussionBoard.admin.posts.polls.erase(connection, {
        postId,
        pollId,
      });
    },
  );
}
