import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Test successful update of an existing setting by an administrator.
 *
 * This test verifies that an admin, after being properly registered and
 * authenticated, can update one or more fields of a setting created in the
 * system. The scenario involves:
 *
 * 1. Registering and authenticating as an admin (to acquire privileges and
 *    valid token).
 * 2. Creating a new setting using the admin context, capturing the returned
 *    setting ID.
 * 3. Performing an update to the setting's value and/or description via the
 *    update endpoint.
 * 4. Verifying that the response contains the updated data.
 * 5. Confirming the changes are persisted by updating the setting and
 *    examining the returned object.
 * 6. Validating that all returned fields conform to the expected data types
 *    and constraints.
 *
 * Random data is used for setting key/value fields and updated values to
 * ensure the test scenario is robust and can be repeated. The update flow
 * does not include error conditions (as this scenario is only for
 * successful updates).
 */
export async function test_api_admin_update_setting_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const user_id: string = typia.random<string & tags.Format<"uuid">>();
  const adminJoinResponse: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: user_id,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminJoinResponse);

  // 2. Create a new setting
  const initialSetting: IDiscussionBoardSetting =
    await api.functional.discussionBoard.admin.settings.create(connection, {
      body: {
        key: RandomGenerator.alphabets(10),
        value: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_system: false,
      } satisfies IDiscussionBoardSetting.ICreate,
    });
  typia.assert(initialSetting);

  // 3. Update the setting's value and description
  const updatedValue = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSetting: IDiscussionBoardSetting =
    await api.functional.discussionBoard.admin.settings.update(connection, {
      settingId: initialSetting.id,
      body: {
        value: updatedValue,
        description: updatedDescription,
      } satisfies IDiscussionBoardSetting.IUpdate,
    });
  typia.assert(updatedSetting);

  // 4. Validate that the returned setting reflects the updated data
  TestValidator.equals(
    "updated value should match",
    updatedSetting.value,
    updatedValue,
  );
  TestValidator.equals(
    "updated description should match",
    updatedSetting.description,
    updatedDescription,
  );
  TestValidator.equals(
    "setting ID should remain unchanged after update",
    updatedSetting.id,
    initialSetting.id,
  );
  TestValidator.equals(
    "setting key should remain unchanged after update",
    updatedSetting.key,
    initialSetting.key,
  );
  // Ensure is_system flag is unchanged
  TestValidator.equals(
    "is_system flag should remain unchanged after update",
    updatedSetting.is_system,
    initialSetting.is_system,
  );
}
