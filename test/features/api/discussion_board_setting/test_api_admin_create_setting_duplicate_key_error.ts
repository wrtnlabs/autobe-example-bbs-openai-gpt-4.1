import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Validate system rejection of duplicate discussion board setting keys by
 * admin.
 *
 * This test ensures that the discussion board settings endpoint enforces
 * the uniqueness constraint on the 'key' property. It is critical that the
 * platform does not allow duplicate configuration keys as this could lead
 * to configuration ambiguity or overwrite vulnerabilities. The workflow
 * demonstrates:
 *
 * 1. Admin registration: Obtain an admin account for authorization.
 * 2. Initial setting creation: Successfully create a new setting with a unique
 *    key.
 * 3. Conflict check: Attempt to create another setting with the same key and
 *    verify that the system rejects it with a uniqueness violation/conflict
 *    error.
 *
 * This guards against regression bugs where the backend might neglect
 * uniqueness on the settings table, ensuring platform configuration remains
 * robust and deterministic.
 */
export async function test_api_admin_create_setting_duplicate_key_error(
  connection: api.IConnection,
) {
  // 1. Register and authorize as admin (simulate admin join for test)
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create initial setting with a random but fixed key
  const settingKey = RandomGenerator.alphaNumeric(12);
  const settingCreateInput = {
    key: settingKey,
    value: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_system: true,
  } satisfies IDiscussionBoardSetting.ICreate;
  const originalSetting =
    await api.functional.discussionBoard.admin.settings.create(connection, {
      body: settingCreateInput,
    });
  typia.assert(originalSetting);
  TestValidator.equals(
    "created setting key matches input",
    originalSetting.key,
    settingKey,
  );
  TestValidator.equals(
    "created setting is_system is correct",
    originalSetting.is_system,
    true,
  );

  // 3. Attempt duplicate creation with same key, expect conflict error
  await TestValidator.error(
    "cannot create duplicate discussion board setting with same key",
    async () => {
      await api.functional.discussionBoard.admin.settings.create(connection, {
        body: {
          key: settingKey, // duplicate on purpose
          value: RandomGenerator.alphaNumeric(14),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_system: false,
        } satisfies IDiscussionBoardSetting.ICreate,
      });
    },
  );
}
