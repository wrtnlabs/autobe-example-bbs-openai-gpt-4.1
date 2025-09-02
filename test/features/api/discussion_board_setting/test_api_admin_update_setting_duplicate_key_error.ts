import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Validates that the update system/business setting API enforces setting
 * key immutability and prevents key duplication.
 *
 * - Registers/admin joins to establish authorization context
 * - Creates two settings, each with a unique key
 * - Attempts an update (on value/description/is_system) without key
 *
 *   - Confirms: update works and key is immutable (remains unchanged)
 * - Tries to update 'key' property (should not compile, so test is not
 *   performed)
 * - Ensures that duplicate keys cannot be produced via valid API usage
 * - Validates that the overall system upholds business rules: key uniqueness
 *   and immutability
 */
export async function test_api_admin_update_setting_duplicate_key_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin (simulate a verified user_id for join)
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(joinResult);

  // 2. Create first setting (with key1)
  const keyOne = "max_post_length";
  const settingOne = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: {
        key: keyOne,
        value: "500",
        description: "Max characters for a post",
        is_system: false,
      } satisfies IDiscussionBoardSetting.ICreate,
    },
  );
  typia.assert(settingOne);
  TestValidator.equals(
    "first setting key should match",
    settingOne.key,
    keyOne,
  );

  // 3. Create second setting (with key2)
  const keyTwo = "flag_threshold";
  const settingTwo = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: {
        key: keyTwo,
        value: "3",
        description: "Flag threshold count for moderation",
        is_system: false,
      } satisfies IDiscussionBoardSetting.ICreate,
    },
  );
  typia.assert(settingTwo);
  TestValidator.equals(
    "second setting key should match",
    settingTwo.key,
    keyTwo,
  );

  // 4. Successfully update a non-key field (e.g., value/description) for settingTwo
  const updatedValue = "4";
  const updateResult =
    await api.functional.discussionBoard.admin.settings.update(connection, {
      settingId: settingTwo.id,
      body: {
        value: updatedValue,
        description: "Updated flag threshold description",
        is_system: false,
      } satisfies IDiscussionBoardSetting.IUpdate,
    });
  typia.assert(updateResult);
  TestValidator.equals(
    "updated setting ID should be unchanged",
    updateResult.id,
    settingTwo.id,
  );
  TestValidator.equals(
    "updated key should remain immutable",
    updateResult.key,
    keyTwo,
  );
  TestValidator.equals(
    "updated value should reflect change",
    updateResult.value,
    updatedValue,
  );
  TestValidator.equals(
    "updated description should be changed",
    updateResult.description,
    "Updated flag threshold description",
  );

  // 5. Attempt to send a key update is not possible with the current type definitions:
  //    TypeScript will prevent usage, so the uniqueness constraint cannot be violated through update.
  //    Instead, try to violate key uniqueness via create and expect error.
  await TestValidator.error(
    "creating a setting with a duplicate key should fail",
    async () => {
      await api.functional.discussionBoard.admin.settings.create(connection, {
        body: {
          key: keyOne, // duplicate of first setting
          value: "999",
          description: "Duplicate attempt",
          is_system: false,
        } satisfies IDiscussionBoardSetting.ICreate,
      });
    },
  );
}
