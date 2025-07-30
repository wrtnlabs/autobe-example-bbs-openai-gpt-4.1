import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test updating an existing admin's user_identifier to a new unique value.
 *
 * This test ensures the following scenario and business rules:
 *
 * 1. Two distinct admin records are created, each with unique user_identifiers.
 * 2. One admin's user_identifier is updated (PUT) to a new, also unique value (not
 *    in use by any other admin), leaving grant/revoke fields unchanged.
 * 3. The update succeeds, the correct admin record is patched, and the
 *    grant/revoke timestamps are not modified.
 * 4. Optionally, verifies another admin record is untouched.
 * 5. Negative: Attempts to update to a duplicate user_identifier fail.
 *
 * Steps:
 *
 * 1. Create admin 1 (user_identifier: A1)
 * 2. Create admin 2 (user_identifier: A2)
 * 3. Update admin 1's user_identifier → NEW_A1 (unique! not A2)
 * 4. Confirm admin 1's id is unchanged, user_identifier is updated, grant/revoke
 *    dates are unchanged
 * 5. Optionally, confirm admin 2 is still untouched
 * 6. Negative: try to set admin 1's user_identifier to admin 2's (should fail)
 */
export async function test_api_discussionBoard_test_update_admin_user_identifier(
  connection: api.IConnection,
) {
  // 1. Create admin 1
  const user_identifier_1: string = RandomGenerator.alphaNumeric(12);
  const granted_at_1: string = new Date().toISOString();
  const admin1 = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: user_identifier_1,
        granted_at: granted_at_1,
        revoked_at: null,
      },
    },
  );
  typia.assert(admin1);

  // 2. Create admin 2
  const user_identifier_2: string = RandomGenerator.alphaNumeric(12);
  const granted_at_2: string = new Date().toISOString();
  const admin2 = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: user_identifier_2,
        granted_at: granted_at_2,
        revoked_at: null,
      },
    },
  );
  typia.assert(admin2);

  // 3. Update admin 1's user_identifier to a new unique value
  const new_user_identifier_1: string = RandomGenerator.alphaNumeric(14);
  const updated_admin1 =
    await api.functional.discussionBoard.admin.admins.update(connection, {
      adminId: admin1.id,
      body: {
        user_identifier: new_user_identifier_1,
        granted_at: null,
        revoked_at: null,
      },
    });
  typia.assert(updated_admin1);
  TestValidator.equals("admin ID unchanged")(updated_admin1.id)(admin1.id);
  TestValidator.equals("user_identifier updated")(
    updated_admin1.user_identifier,
  )(new_user_identifier_1);
  TestValidator.equals("granted_at is not modified")(updated_admin1.granted_at)(
    admin1.granted_at,
  );
  TestValidator.equals("revoked_at is not modified")(updated_admin1.revoked_at)(
    admin1.revoked_at,
  );

  // 4. Optionally verify admin 2 is untouched
  TestValidator.equals("admin2 unchanged")(admin2.user_identifier)(
    user_identifier_2,
  );

  // 5. Negative: try to set admin1's user_identifier to admin2's (should fail)
  await TestValidator.error("duplicate user_identifier prohibited")(
    async () => {
      await api.functional.discussionBoard.admin.admins.update(connection, {
        adminId: admin1.id,
        body: {
          user_identifier: user_identifier_2,
          granted_at: null,
          revoked_at: null,
        },
      });
    },
  );
}
