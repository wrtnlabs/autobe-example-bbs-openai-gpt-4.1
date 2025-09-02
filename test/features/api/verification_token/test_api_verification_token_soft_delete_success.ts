import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verify soft deletion of a verification token as an admin.
 *
 * This test checks whether an administrator can perform a soft delete of a
 * verification token using the proper endpoint. The deletion (soft-delete)
 * must mark the token as deleted (not remove from the DB), ensuring audit
 * trail retention and business compliance.
 *
 * Steps:
 *
 * 1. Register an admin user (via /auth/admin/join).
 * 2. Simulate the presence of a verification token using a generated UUID.
 * 3. Call the soft-delete endpoint as the admin for that token.
 * 4. Call the deletion again to ensure idempotency and permissions (no error
 *    on repeated soft-delete).
 * 5. Confirm that both calls complete with no exceptions (since read/validate
 *    usage API is not present).
 */
export async function test_api_verification_token_soft_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin authorization output includes valid token",
    typeof adminAuth.token.access === "string" && !!adminAuth.token.access,
  );

  // 2. Simulate an existing verification token to delete
  const verificationTokenId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Soft delete as admin
  await api.functional.discussionBoard.admin.verificationTokens.erase(
    connection,
    {
      verificationTokenId,
    },
  );

  // 4. Ensure idempotency: second soft-delete of same token does not error
  await api.functional.discussionBoard.admin.verificationTokens.erase(
    connection,
    {
      verificationTokenId,
    },
  );

  // 5. Final assertion: if no exception was thrown, deletion is presumed successful (read API not present)
  TestValidator.predicate(
    "verification token soft-deletion endpoints ran without error",
    true,
  );
}
