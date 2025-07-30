import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that deleting a non-existent notification returns not found error.
 *
 * This test checks system behavior when a user attempts to delete a
 * notification record by ID that either never existed in the system, or has
 * already been deleted. The operation should fail with a not-found error, and
 * the system must not alter any other data or state. The error should be
 * explicit (such as a 404) and not generic. Testing with a random UUID
 * guarantees the notification does not exist.
 *
 * 1. Generate a random UUID (which does not correspond to any notification)
 * 2. Attempt to delete this notification as the current user
 * 3. Assert that the API throws an error ("not found", e.g., 404)
 * 4. Confirm that the error is not a success, and no data is deleted
 */
export async function test_api_discussionBoard_test_delete_nonexistent_notification_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for notificationId (guaranteed not to exist)
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to delete the (non-existent) notification
  await TestValidator.error(
    "Deleting non-existent notification returns not found",
  )(async () => {
    await api.functional.discussionBoard.member.notifications.erase(
      connection,
      { notificationId },
    );
  });
}
