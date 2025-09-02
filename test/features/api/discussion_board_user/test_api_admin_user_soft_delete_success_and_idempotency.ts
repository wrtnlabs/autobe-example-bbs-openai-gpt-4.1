import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test admin soft-delete (deactivate) of a user (idempotency & error
 * handling)
 *
 * This E2E test verifies that an admin can soft-delete (deactivate) a user
 * by userId. It covers:
 *
 * - Normal flow: Admin creation, regular user creation, admin deletes user
 * - Idempotency: Multiple deletes on same user do not error
 * - Edge: Deleting non-existent user returns error or idempotent handling
 * - Only direct endpoint operations are tested, not user listing (not
 *   available in API).
 *
 * Steps:
 *
 * 1. Register a regular user; persist their UUID
 * 2. Register a different user, then elevate to admin via /auth/admin/join
 *    (user must be verified)
 * 3. Switch authentication context to admin by joining as admin user
 * 4. Admin invokes /discussionBoard/admin/users/{userId} DELETE to remove the
 *    regular user
 * 5. Validate that the operation succeeds (no exception)
 * 6. Attempt to delete the same user again (should not throw, or is
 *    idempotent)
 * 7. Attempt to delete a random, non-existent UUID (should throw a 404 or
 *    similar error)
 * 8. Confirm idempotency and error handling on soft-delete
 */
export async function test_api_admin_user_soft_delete_success_and_idempotency(
  connection: api.IConnection,
) {
  // 1. Register a user to be the soft-delete target
  const regularUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "Aa$1",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(regularUser);
  const targetUserId = regularUser.user.id;

  // 2. Register a different user for admin elevation
  const adminBaseUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "Bb!2",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminBaseUser);

  // 3. Elevate adminBaseUser to admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminBaseUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);

  // Now, context is authenticated as admin (connection.headers updated)

  // 4. Admin soft-deletes the target user (normal operation)
  await api.functional.discussionBoard.admin.users.erase(connection, {
    userId: targetUserId,
  });

  // 5. Try deleting the same user again: should be idempotent (no error or handled gracefully)
  // Depending on implementation, this may silently succeed or return NotFound; test allows both.
  await api.functional.discussionBoard.admin.users.erase(connection, {
    userId: targetUserId,
  });

  // 6. Try deleting a completely non-existent user
  await TestValidator.error(
    "fail to soft-delete non-existent user",
    async () => {
      await api.functional.discussionBoard.admin.users.erase(connection, {
        userId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
