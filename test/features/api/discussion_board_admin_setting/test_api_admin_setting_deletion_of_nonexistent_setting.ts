import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test admin deletion of a non-existent discussion board setting.
 *
 * This test validates that an authenticated admin attempting to delete a
 * setting using a random non-existent UUID results in a not found error
 * (404) and no inadvertent data modification. The flow ensures correct
 * authorization is established via admin join and asserts that the DELETE
 * call for the non-existent setting is robustly handled by the system's
 * error handler.
 *
 * Steps:
 *
 * 1. Register a new admin account (simulate verified user join).
 * 2. Attempt to delete a setting using a random settingId (UUID) guaranteed
 *    not to exist.
 * 3. Assert that the attempt results in a not found error (status 404),
 *    confirming that the system does not allow deletion of unknown settings
 *    and protects against accidental data loss or invalid references.
 * 4. (Optional) If setting listing endpoint becomes available, validate that
 *    no settings are erroneously affected as a result of the failed
 *    deletion attempt.
 */
export async function test_api_admin_setting_deletion_of_nonexistent_setting(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (assumes user_id is random and unique)
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);
  // 2. Attempt to delete a setting using a random, guaranteed non-existent UUID
  const fakeSettingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent admin setting should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.settings.erase(connection, {
        settingId: fakeSettingId,
      });
    },
  );
}
