import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test attempting to delete a setting with a non-existent or already-deleted
 * settingId.
 *
 * This test verifies that attempting to delete a discussion board setting using
 * a random (non-existent or already-deleted) UUID as the settingId results in
 * an appropriate not found error from the API.
 *
 * Compliance logging is assumed to be performed server-side and is not verified
 * by the E2E test.
 *
 * Steps:
 *
 * 1. (Assumed) Admin authentication is established by the test environment.
 * 2. Generate a random UUID for settingId that does not correspond to a real
 *    setting.
 * 3. Attempt to call the erase endpoint with the random UUID.
 * 4. Assert that the API throws an error, such as 404 Not Found.
 */
export async function test_api_discussionBoard_test_delete_setting_with_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. (Assumed) The connection is already authenticated as admin.

  // 2. Generate a random UUID for a non-existent settingId.
  const nonExistentSettingId = typia.random<string & tags.Format<"uuid">>();

  // 3-4. Attempt to delete and verify that an error (not found) is thrown.
  await TestValidator.error(
    "should throw error when deleting non-existent or already-deleted setting",
  )(async () => {
    await api.functional.discussionBoard.admin.settings.erase(connection, {
      settingId: nonExistentSettingId,
    });
  });
}
