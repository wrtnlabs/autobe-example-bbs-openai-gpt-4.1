import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Retrieve a single board administrator's details by UUID and verify data
 * integrity.
 *
 * This test ensures the admin info retrieval endpoint works as intended for
 * permission and compliance workflows:
 *
 * 1. Create a discussion board admin entry (with unique user_identifier,
 *    granted_at, and possibly revoked_at).
 * 2. Retrieve the created admin entity using its id via GET
 *    `/discussionBoard/admin/admins/{adminId}`.
 * 3. Assert that all returned information (id, user_identifier, granted_at,
 *    revoked_at) matches what was submitted at creation, verifying correct
 *    persistence and retrieval.
 *
 * Steps:
 *
 * 1. Prepare a unique user_identifier and grant timestamp; revoked_at may be null
 *    or a specific datetime.
 * 2. Create admin via POST `/discussionBoard/admin/admins`.
 * 3. GET the admin by ID using `/discussionBoard/admin/admins/{adminId}`.
 * 4. Assert equality of the returned object's fields with those used at creation.
 */
export async function test_api_discussionBoard_admin_admins_test_get_admin_by_id_when_admin_exists(
  connection: api.IConnection,
) {
  // 1. Prepare a unique user_identifier, grant timestamp, and possibly revoked_at
  const now = new Date().toISOString();
  const userIdentifier = `audit_test_admin_${now}`;
  const adminInput: IDiscussionBoardAdmin.ICreate = {
    user_identifier: userIdentifier,
    granted_at: now,
    revoked_at: null,
  };

  // 2. Create the admin
  const created: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: adminInput,
    });
  typia.assert(created);
  TestValidator.equals("user_identifier matches")(created.user_identifier)(
    userIdentifier,
  );
  TestValidator.equals("granted_at matches")(created.granted_at)(now);
  TestValidator.equals("revoked_at matches null")(created.revoked_at)(null);

  // 3. Retrieve the created admin by id
  const retrieved: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.at(connection, {
      adminId: created.id,
    });
  typia.assert(retrieved);

  // 4. Assert all fields match creation
  TestValidator.equals("id matches")(retrieved.id)(created.id);
  TestValidator.equals("user_identifier matches")(retrieved.user_identifier)(
    userIdentifier,
  );
  TestValidator.equals("granted_at matches")(retrieved.granted_at)(now);
  TestValidator.equals("revoked_at matches null")(retrieved.revoked_at)(null);
}
