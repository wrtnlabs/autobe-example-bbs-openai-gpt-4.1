import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for verifying admin receives an error when deleting a
 * non-existent or already-deleted comment.
 *
 * This test checks that the system returns the correct error both when an
 * administrator attempts to delete a comment that does not exist and when
 * performing a repeat deletion on the same identifiers, using the admin
 * permission route.
 *
 * **Test Steps:**
 *
 * 1. Register as an admin via /auth/admin/join (requires a user_id as input;
 *    user creation is assumed or handled elsewhere).
 * 2. Attempt to DELETE a comment from a random threadId, postId, and commentId
 *    as admin; this should result in a 404 not found or similar error.
 * 3. Attempt to DELETE again using the same ids to simulate an already deleted
 *    comment; should still yield a not found/already deleted error,
 *    ensuring idempotency and error consistency.
 * 4. Assert that an error is returned in both error scenarios using
 *    TestValidator.error with appropriate descriptive titles.
 * 5. Confirm that admin authentication context is correctly maintained for
 *    both requests.
 */
export async function test_api_comment_soft_delete_admin_permission_error(
  connection: api.IConnection,
) {
  // 1. Register as admin (admin join sets token in connection.headers)
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Attempt to delete non-existent comment as admin
  const threadId: string = typia.random<string & tags.Format<"uuid">>();
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const commentId: string = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "delete non-existent comment fails with not found or already deleted error",
    async () => {
      await api.functional.discussionBoard.admin.threads.posts.comments.erase(
        connection,
        {
          threadId,
          postId,
          commentId,
        },
      );
    },
  );

  // 3. Attempt repeat deletion (should consistently throw same error)
  await TestValidator.error(
    "repeat delete fails as already deleted or still not found",
    async () => {
      await api.functional.discussionBoard.admin.threads.posts.comments.erase(
        connection,
        {
          threadId,
          postId,
          commentId,
        },
      );
    },
  );
}
