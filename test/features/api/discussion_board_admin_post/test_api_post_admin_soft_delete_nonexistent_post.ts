import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Attempt to delete a discussion board post that does not exist as an
 * admin.
 *
 * This test ensures proper error handling when an admin, after joining and
 * authenticating, attempts to perform a soft delete on a postId within a
 * threadId that is not present in the system. The operation should fail
 * (typically a 404 error), confirming that the API does not allow soft
 * deletion of posts that do not exist or are already deleted, even for
 * admins with full privileges.
 *
 * Steps:
 *
 * 1. Register a new admin and ensure authentication is established by
 *    capturing the returned token/context.
 * 2. Generate random UUIDs for threadId and postId (ensuring they do not map
 *    to any actual entity).
 * 3. Try to invoke the soft delete API call for the (non-existent) post as the
 *    authenticated admin.
 * 4. Assert that an error is thrown and that it corresponds to 'not found'
 *    (404) or a suitable business error.
 */
export async function test_api_post_admin_soft_delete_nonexistent_post(
  connection: api.IConnection,
) {
  // 1. Register admin and establish authentication
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Generate random UUIDs for threadId and postId (does not exist in system)
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 3-4. Attempt to soft-delete a post that doesn't exist and verify error
  await TestValidator.error(
    "soft-deleting non-existent admin post returns not found or error",
    async () => {
      await api.functional.discussionBoard.admin.threads.posts.erase(
        connection,
        {
          threadId,
          postId,
        },
      );
    },
  );
}
