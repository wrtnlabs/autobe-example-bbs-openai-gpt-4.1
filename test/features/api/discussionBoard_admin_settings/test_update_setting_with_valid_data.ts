import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Validates updating an existing discussion board setting with valid changes.
 *
 * This test ensures that an admin can successfully update a discussion board
 * setting using valid update data. It verifies that the update endpoint works
 * for legitimate updates (such as changing the value or description), the
 * returned object properly reflects all changes, relevant timestamps are
 * refreshed, and all system invariants (such as unique key and schema) are
 * preserved. Although the scenario mentions audit logs, direct log validation
 * is omitted (as no explicit log-fetching endpoint exists), but update side
 * effects are validated through the updated record.
 *
 * Test Steps:
 *
 * 1. Create a discussion board setting to serve as the subject of updating
 *    (ensures pre-existence).
 * 2. Update the setting using the PUT endpoint with a valid change (e.g., new
 *    description and a new value).
 * 3. Validate that response contains the updated values, the id and setting_key
 *    are correct, and updated_at timestamp is refreshed.
 * 4. Confirm that changes match what was requested, and system constraints (UUID,
 *    value, etc.) are preserved.
 *
 * Dependencies: An admin context is required.
 */
export async function test_api_discussionBoard_admin_settings_test_update_setting_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a baseline discussion board setting (dependency)
  const initialSettingKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const initialSettingValue = RandomGenerator.alphaNumeric(12);
  const initialDescription = RandomGenerator.paragraph()(1);
  const created = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: {
        setting_key: initialSettingKey,
        setting_value: initialSettingValue,
        description: initialDescription,
      } satisfies IDiscussionBoardSetting.ICreate,
    },
  );
  typia.assert(created);

  // 2. Prepare update: change both value and description
  const updatedSettingValue = RandomGenerator.alphaNumeric(20);
  const updatedDescription = RandomGenerator.paragraph()(2);
  const updateData: IDiscussionBoardSetting.IUpdate = {
    setting_value: updatedSettingValue,
    description: updatedDescription,
  };

  // 3. Call update endpoint
  const updated = await api.functional.discussionBoard.admin.settings.update(
    connection,
    {
      settingId: created.id,
      body: updateData,
    },
  );
  typia.assert(updated);

  // 4. Validate: ID, key unchanged, values match update, timestamps updated
  TestValidator.equals("id preserved")(updated.id)(created.id);
  TestValidator.equals("setting_key unchanged")(updated.setting_key)(
    created.setting_key,
  );
  TestValidator.equals("new value")(updated.setting_value)(updatedSettingValue);
  TestValidator.equals("new description")(updated.description)(
    updatedDescription,
  );
  // Timestamps: updated_at must be refreshed (greater than original)
  TestValidator.predicate("updated_at should be newer")(
    new Date(updated.updated_at).getTime() >
      new Date(created.updated_at).getTime(),
  );
  // created_at stays the same
  TestValidator.equals("created_at persists")(updated.created_at)(
    created.created_at,
  );
}
