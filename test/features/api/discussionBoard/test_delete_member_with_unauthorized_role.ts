import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that only admins can delete board member records (role-based access
 * control).
 *
 * This test verifies the following:
 *
 * - Deletes are only allowed by admin users (enforced via API restriction).
 * - Attempting to delete as a non-admin is denied (permission error thrown).
 * - The underlying database record is unchanged (member remains after failed
 *   delete).
 * - An audit event is logged for the denied attempt (this part is not testable if
 *   no API/log access; omit if unsupported).
 *
 * Test Steps:
 *
 * 1. Use admin privileges to create a member (prerequisite setup).
 * 2. Switch to a non-admin connection (simulate as non-admin; assume connection
 *    without admin headers/claims).
 * 3. Attempt member deletion -- expect permission error.
 * 4. Check that the member record still exists (admin connection, fetch or list to
 *    confirm).
 * 5. (Omit audit log validation unless such log retrieval API exists.)
 *
 * Notes: If role simulation is unavailable (no API for login/asUser/etc),
 * connection header/token adjustment should be assumed.
 */
export async function test_api_discussionBoard_test_delete_member_with_unauthorized_role(
  connection: api.IConnection,
) {
  // 1. Create member as admin
  const memberToDelete =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(10),
        joined_at: new Date().toISOString(),
      },
    });
  typia.assert(memberToDelete);

  // 2. Simulate a non-admin connection (remove admin privileges from connection)
  const { Authorization, ...restHeaders } = connection.headers ?? {};
  const nonAdminConnection: api.IConnection = {
    ...connection,
    headers: restHeaders, // Authorization header omitted
  };

  // 3. Attempt to delete the member as non-admin -- expect permission error
  await TestValidator.error("Non-admin cannot delete member")(() =>
    api.functional.discussionBoard.admin.members.erase(nonAdminConnection, {
      memberId: memberToDelete.id,
    }),
  );

  // 4. Confirm the member still exists (by attempting read or create same again - expect duplicate error)
  // Since there is no member lookup, attempt to recreate (should fail as user_identifier must be unique)
  await TestValidator.error("Member record remains after failed delete")(() =>
    api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: memberToDelete.user_identifier,
        joined_at: new Date().toISOString(),
      },
    }),
  );
  // 5. Audit event validation skipped (no accessible logs API for audit events)
}
