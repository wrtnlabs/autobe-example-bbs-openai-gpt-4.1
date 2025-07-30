import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Validate error handling for duplicate setting_key creation in discussion
 * board settings.
 *
 * This test confirms that the admin API prevents creation of a new setting when
 * the provided setting_key already exists in the system, enforcing uniqueness
 * constraint at the API level. The workflow ensures the initial setting is
 * created successfully and then verifies the error-throwing behavior and that
 * no changes are made to the existing setting.
 *
 * Steps:
 *
 * 1. Admin creates an initial discussion board setting with a unique key.
 * 2. Admin attempts to create a second setting with the same key (should fail with
 *    uniqueness error).
 * 3. Assert proper error is thrown and existing setting remains unchanged.
 */
export async function test_api_discussionBoard_test_create_setting_with_duplicate_key(
  connection: api.IConnection,
) {
  // 1. Admin creates the initial setting with a unique key
  const keyValue: string = RandomGenerator.alphaNumeric(12);
  const initialPayload: IDiscussionBoardSetting.ICreate = {
    setting_key: keyValue,
    setting_value: RandomGenerator.alphaNumeric(24),
    description: RandomGenerator.paragraph()(1),
  };
  const initialSetting =
    await api.functional.discussionBoard.admin.settings.create(connection, {
      body: initialPayload,
    });
  typia.assert(initialSetting);
  TestValidator.equals("setting key assigned")(initialSetting.setting_key)(
    keyValue,
  );

  // 2. Attempt to create a duplicate setting (should throw uniqueness error)
  const duplicatePayload: IDiscussionBoardSetting.ICreate = {
    setting_key: keyValue, // Same key
    setting_value: RandomGenerator.alphaNumeric(20), // Different value, but key is the conflict
    description: RandomGenerator.paragraph()(1),
  };
  await TestValidator.error("should throw on duplicate key")(async () => {
    await api.functional.discussionBoard.admin.settings.create(connection, {
      body: duplicatePayload,
    });
  });

  // 3. Confirm the existing setting has not changed
  // (The API does not provide a direct way to list or read by key, so this step
  //  is currently not implementable unless such API exists.)
}
