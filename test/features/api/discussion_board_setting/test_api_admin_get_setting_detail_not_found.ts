import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Validate that requesting a discussion board setting detail using an
 * invalid (non-existent) settingId results in a not found error.
 *
 * This scenario ensures the GET /discussionBoard/admin/settings/{settingId}
 * endpoint properly enforces existence checks and returns an error when an
 * admin attempts to fetch details for a setting that does not exist. It
 * guarantees only authenticated admins can perform the operation, and
 * expects that providing a fake/non-existent UUID produces a clear error
 * (typically 404 Not Found).
 *
 * Business context: Admins need a reliable indication when querying for
 * system or business settings using IDs that are not present in the system.
 * Proper error signaling supports security, integrity, and a robust UI/UX.
 *
 * Step-by-step process:
 *
 * 1. Register an admin (authenticate as admin)
 * 2. Attempt to access a setting using a random, ensured non-existent UUID
 * 3. Verify the API throws an error due to non-existent setting
 */
export async function test_api_admin_get_setting_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register admin for authentication context
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 2. Prepare a guaranteed non-existent settingId (random UUID)
  const fakeSettingId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to access non-existent setting detail, expect error
  await TestValidator.error(
    "should throw error for non-existent settingId",
    async () => {
      await api.functional.discussionBoard.admin.settings.at(connection, {
        settingId: fakeSettingId,
      });
    },
  );
}
