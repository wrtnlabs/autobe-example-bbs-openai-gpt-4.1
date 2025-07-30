import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate deletion of a non-existent notification as an admin user.
 *
 * This test ensures that attempting to delete a notification ID which does not
 * exist in the database yields a not-found error. It specifically verifies
 * that:
 *
 * 1. An arbitrary (random) notificationId is generated, guaranteed not to exist.
 * 2. The deletion attempt as an admin yields a 404 or similar not-found error
 *    (verified by catching and asserting the error occurs).
 * 3. No side effects to database or state occur.
 * 4. (If possible) The system still generates an appropriate audit log for the
 *    attempt.
 *
 * Steps:
 *
 * 1. Generate a random UUID for notificationId (that does not exist).
 * 2. Call the admin notification delete endpoint using this ID.
 * 3. Catch the error and verify it is a user-friendly not-found error (no need to
 *    assert error message details).
 * 4. Optionally, if the API supported it, verify no audit/event/logging side
 *    effects occur (not directly testable here).
 */
export async function test_api_discussionBoard_test_admin_delete_nonexistent_notification_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random, likely non-existent notificationId (UUID format)
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete this non-existent notification and expect a not-found error
  await TestValidator.error("deleting non-existent notification should fail")(
    async () => {
      await api.functional.discussionBoard.admin.notifications.erase(
        connection,
        { notificationId },
      );
    },
  );

  // 3. No further side effects can be checked directly via this API.
  // 4. If audit logging can be indirectly asserted, it should be checked using appropriate audit endpoints (not applicable here).
}
