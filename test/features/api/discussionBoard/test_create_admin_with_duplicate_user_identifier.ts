import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validates that attempting to create a discussion board admin with a duplicate
 * user_identifier fails.
 *
 * This test ensures the system enforces uniqueness for the user_identifier
 * field in the admin model.
 *
 * Process:
 *
 * 1. Create an initial admin with a fixed user_identifier (simulate a standard
 *    admin assignment).
 * 2. Attempt to create another admin with the same user_identifier.
 * 3. Assert that the second attempt fails with a unique constraint violation
 *    (i.e., returns error or throws).
 * 4. Optionally, validate that the first admin still exists and that no duplicate
 *    entry is present (not possible with available endpoints).
 */
export async function test_api_discussionBoard_test_create_admin_with_duplicate_user_identifier(
  connection: api.IConnection,
) {
  // 1. Create an initial admin with a fixed user_identifier
  const now = new Date().toISOString();
  const userIdentifier = RandomGenerator.alphaNumeric(12);
  const firstCreateBody = {
    user_identifier: userIdentifier,
    granted_at: now,
    revoked_at: null,
  } satisfies IDiscussionBoardAdmin.ICreate;

  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: firstCreateBody,
    },
  );
  typia.assert(admin);
  TestValidator.equals("user_identifier assigned correctly")(
    admin.user_identifier,
  )(userIdentifier);
  TestValidator.equals("active assignment")(admin.revoked_at)(null);

  // 2. Attempt to create another admin with the same user_identifier
  const duplicateCreateBody = {
    user_identifier: userIdentifier,
    granted_at: now,
    revoked_at: null,
  } satisfies IDiscussionBoardAdmin.ICreate;

  await TestValidator.error("duplicate user_identifier rejected")(async () => {
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: duplicateCreateBody,
    });
  });

  // 3. Optionally: re-read or inspect list/audit logs, if possible (not implemented here since listing API is not provided)
}
