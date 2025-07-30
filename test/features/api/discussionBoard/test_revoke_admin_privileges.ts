import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test revoking admin privileges via the revoked_at field and verify correct
 * update.
 *
 * Business context: When an admin's privileges are revoked (by setting
 * revoked_at), they should be marked as revoked and lose admin abilities. This
 * is important for security and access control. Audit logging should capture
 * the action. If further modifications are disallowed after revocation, they
 * should fail.
 *
 * Steps:
 *
 * 1. Create a new admin assignment (simulate assigning admin role to a user).
 * 2. Revoke admin by setting revoked_at to the current datetime using update
 *    endpoint.
 * 3. Confirm output entity reflects the revocation (revoked_at is set, returned
 *    correctly, id unchanged).
 * 4. (If enforcable: Attempt a second update with user_identifier and expect
 *    error; validate update lock on revoked record.)
 */
export async function test_api_discussionBoard_admin_admins_test_revoke_admin_privileges(
  connection: api.IConnection,
) {
  // 1. Create a new admin assignment
  const user_identifier = RandomGenerator.alphaNumeric(12);
  const granted_at = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier,
        granted_at,
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.equals("revoked_at is null on creation")(admin.revoked_at)(
    null,
  );

  // 2. Revoke admin privileges (set revoked_at)
  const revoked_at = new Date().toISOString();
  const revoked = await api.functional.discussionBoard.admin.admins.update(
    connection,
    {
      adminId: admin.id,
      body: {
        revoked_at,
      } satisfies IDiscussionBoardAdmin.IUpdate,
    },
  );
  typia.assert(revoked);
  TestValidator.equals("revoked record id")(revoked.id)(admin.id);
  TestValidator.equals("revoked_at set")(revoked.revoked_at)(revoked_at);

  // 3. Further update should be rejected if revision lock is enforced
  await TestValidator.error("further update to revoked admin should fail")(
    async () => {
      await api.functional.discussionBoard.admin.admins.update(connection, {
        adminId: admin.id,
        body: {
          user_identifier: RandomGenerator.alphaNumeric(10),
        } satisfies IDiscussionBoardAdmin.IUpdate,
      });
    },
  );
}
