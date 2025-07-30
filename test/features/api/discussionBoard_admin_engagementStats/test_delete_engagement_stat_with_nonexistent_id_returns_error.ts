import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test deletion of an engagement stat with a non-existent or already deleted
 * ID.
 *
 * This test simulates a DELETE operation targeting an engagement stat that does
 * NOT exist in the system, either because it was never created or already
 * deleted. The system is expected to return an error or not found response,
 * with no unintended data modifications or side effects.
 *
 * Steps:
 *
 * 1. Attempt to delete an engagement stat entry using a random UUID that is
 *    extremely unlikely to exist in the DB.
 * 2. Confirm that the API returns an error indicating the resource was not found
 *    (e.g., 404 status code or equivalent exception).
 * 3. Ensure that no unexpected errors occur and no other data is affected.
 * 4. Optionally, repeat with another deletion attempt on the same ID to confirm
 *    consistent error behavior.
 */
export async function test_api_discussionBoard_admin_engagementStats_test_delete_engagement_stat_with_nonexistent_id_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that does not correspond to any engagement stat
  const engagementStatId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt deletion and expect an error response (resource not found)
  await TestValidator.error("Deleting nonexistent engagement stat should fail")(
    async () => {
      await api.functional.discussionBoard.admin.engagementStats.erase(
        connection,
        {
          engagementStatId,
        },
      );
    },
  );

  // 3. Attempt to delete the same nonexistent ID again and expect consistent error behavior
  await TestValidator.error("Repeated deletion attempt returns not found")(
    async () => {
      await api.functional.discussionBoard.admin.engagementStats.erase(
        connection,
        {
          engagementStatId,
        },
      );
    },
  );
}
