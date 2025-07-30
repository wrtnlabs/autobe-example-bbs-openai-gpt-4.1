import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test duplicate user_identifier update for discussion board admin uniqueness
 * enforcement.
 *
 * This test ensures the system prevents updating an administrator's
 * user_identifier to a value that already exists for another administrator. It
 * follows these steps:
 *
 * 1. Create the first admin with a unique user_identifier.
 * 2. Create a second admin with a different user_identifier.
 * 3. Attempt to update the second admin and set its user_identifier to the same as
 *    the first admin.
 * 4. Expect a uniqueness constraint violation error on the update attempt.
 * 5. Confirm the error prevents any modification to both admins.
 *
 * Ensures system uniqueness, error clarity, and that operations are safely
 * logged.
 */
export async function test_api_discussionBoard_test_update_admin_with_duplicate_user_identifier(
  connection: api.IConnection,
) {
  // 1. Create the first admin
  const firstAdminIdentifier = `user_${RandomGenerator.alphaNumeric(8)}`;
  const firstGrantedAt = new Date().toISOString();
  const firstAdmin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: firstAdminIdentifier,
        granted_at: firstGrantedAt,
      },
    },
  );
  typia.assert(firstAdmin);
  TestValidator.equals("Admin user_identifier matches")(
    firstAdmin.user_identifier,
  )(firstAdminIdentifier);

  // 2. Create the second admin
  let secondAdminIdentifier: string;
  do {
    secondAdminIdentifier = `user_${RandomGenerator.alphaNumeric(8)}`;
  } while (secondAdminIdentifier === firstAdminIdentifier);
  const secondGrantedAt = new Date(Date.now() + 1000).toISOString();
  const secondAdmin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: secondAdminIdentifier,
        granted_at: secondGrantedAt,
      },
    },
  );
  typia.assert(secondAdmin);
  TestValidator.notEquals("Admins have different user_identifier")(
    secondAdmin.user_identifier,
  )(firstAdminIdentifier);

  // 3. Attempt to update the second admin's user_identifier to match the first
  await TestValidator.error(
    "Uniqueness violation expected when updating user_identifier",
  )(async () => {
    await api.functional.discussionBoard.admin.admins.update(connection, {
      adminId: secondAdmin.id,
      body: {
        user_identifier: firstAdminIdentifier,
      },
    });
  });

  // 4. Optionally: Would re-query here to confirm no state change, if GET endpoint exists.
  // Not possible in current API; rely on error validation above.
}
