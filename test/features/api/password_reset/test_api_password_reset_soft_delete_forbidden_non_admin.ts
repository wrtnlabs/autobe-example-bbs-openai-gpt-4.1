import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Verify that non-admin users are forbidden from soft-deleting password
 * reset entries.
 *
 * Business Context: Only admin actors are allowed to soft-delete
 * (GDPR/compliance) password reset events. Non-admin users must be
 * rigorously rejected by API-level access control. This test ensures the
 * proper enforcement of privileged operation boundaries by confirming
 * non-admins receive an error response when attempting forbidden
 * operations.
 *
 * Steps:
 *
 * 1. Register a standard discussion board user (non-admin) with unique
 *    credentials and explicit consent.
 * 2. The user is automatically authenticated (session established) by the join
 *    endpoint.
 * 3. Attempt to issue a DELETE request for
 *    /discussionBoard/admin/passwordResets/{passwordResetId} using a random
 *    UUID.
 * 4. Assert that forbidden/error response is returned, indicating correct
 *    authorization enforcement.
 *
 * Notes:
 *
 * - Resource existence is not relevant; test focuses exclusively on
 *   authorization boundary (permission denial for non-admin).
 * - Admin path happy-case is not covered here.
 */
export async function test_api_password_reset_soft_delete_forbidden_non_admin(
  connection: api.IConnection,
) {
  // 1. Register standard discussion board user (non-admin)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(12);
  const password = RandomGenerator.alphaNumeric(16) + "Aa!";
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Session established by join; user context active

  // 3. Attempt forbidden soft-delete as non-admin
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-admin user cannot soft-delete password reset entry",
    async () => {
      await api.functional.discussionBoard.admin.passwordResets.erase(
        connection,
        {
          passwordResetId,
        },
      );
    },
  );
}
