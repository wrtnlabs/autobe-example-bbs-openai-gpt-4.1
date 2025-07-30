import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test deletion of a non-existent activity log entry via admin API.
 *
 * This test verifies that when an admin attempts to delete an activity log
 * entry with a UUID that does not exist (never-created or already-deleted), the
 * API responds by throwing a not-found error (e.g., 404). This ensures robust
 * error handling and prevents attempted deletion of arbitrary or invalid
 * records.
 *
 * Steps:
 *
 * 1. Generate a random UUID not tied to any actual activity log.
 * 2. Attempt to delete the activity log entry via the admin API.
 * 3. Assert that an error is thrown (using TestValidator.error) to indicate
 *    not-found.
 * 4. (Note) No further table/audit verification can be performed without a list
 *    endpoint.
 */
export async function test_api_discussionBoard_test_delete_activity_log_nonexistent_record(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that does not correspond to any log entry
  const id = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt delete and assert a not-found error is thrown
  await TestValidator.error(
    "should throw not found for non-existent activity log",
  )(() =>
    api.functional.discussionBoard.admin.activityLogs.erase(connection, {
      activityLogId: id,
    }),
  );
}
