import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate the hard deletion workflow for a discussion board admin using a
 * valid adminId.
 *
 * This test ensures that when a valid admin user is deleted through the DELETE
 * endpoint, the admin record is removed from the system, privileges are
 * revoked, accessing the resource yields a not-found error, and the audit log
 * (if available) records the action.
 *
 * Steps:
 *
 * 1. Create a new admin by calling the POST /discussionBoard/admin/admins
 *    endpoint. Capture the full returned record including its UUID (admin id).
 * 2. Delete the admin by calling DELETE /discussionBoard/admin/admins/{adminId}
 *    with the returned id. Ensure the API returns a 204 No Content response as
 *    per contract.
 * 3. Attempt to GET or otherwise access the deleted admin by its id (skip this if
 *    there is no GET endpoint - explain). Confirm that a 404 Not Found error is
 *    returned, verifying deletion.
 * 4. (If possible) Confirm that privileges associated with the user_identifier are
 *    revoked immediately (this may be validated by reviewing the deleted admin
 *    record’s revoked_at field, if accessible, or by absence from any listing
 *    endpoint).
 * 5. (If audit logging is externally verifiable, which is often not exposed to
 *    API, note as a TODO step; otherwise omit actual audit log validation).
 *
 * This test ensures secure and permanent removal of privileged users, required
 * for regulatory compliance and operational integrity.
 */
export async function test_api_discussionBoard_test_delete_admin_with_valid_id(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin
  const now = new Date().toISOString();
  const user_identifier = `testadmin_${RandomGenerator.alphaNumeric(10)}`;
  const createBody = {
    user_identifier,
    granted_at: now,
    // revoked_at omitted for active admin
  } satisfies IDiscussionBoardAdmin.ICreate;
  const admin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: createBody,
    });
  typia.assert(admin);
  TestValidator.equals("admin user_identifier matches")(admin.user_identifier)(
    user_identifier,
  );

  // Step 2: Delete the admin
  await api.functional.discussionBoard.admin.admins.erase(connection, {
    adminId: admin.id,
  });

  // Step 3: Verify attempting to fetch deleted admin returns not found error
  // (No GET endpoint provided: this validation step is noted but cannot be implemented here.)

  // Step 4: (No privilege list or revoked_at validator exposed by other endpoints; not implementable)

  // Step 5: (Audit log validation not exposed; not implementable)
}
