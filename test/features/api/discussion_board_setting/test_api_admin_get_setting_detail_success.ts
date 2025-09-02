import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Verify that an admin can fetch the detail of a discussion board setting
 * by its ID and that all fields in the response match what was created.
 *
 * Steps:
 *
 * 1. Register an admin using the /auth/admin/join endpoint with a new, random
 *    user_id (type: string & tags.Format<"uuid">).
 * 2. Create a new setting through /discussionBoard/admin/settings (key, value,
 *    is_system, optional description).
 * 3. Use the resulting setting's id to request setting details with
 *    /discussionBoard/admin/settings/{settingId}.
 * 4. Assert that the returned IDiscussionBoardSetting exactly matches the
 *    properties set on creation (key, value, description, is_system), and
 *    that id matches the created one. Also check timestamps and deleted_at
 *    is null/undefined.
 */
export async function test_api_admin_get_setting_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const joinResp = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(joinResp);

  // 2. Create a new setting
  const createInput = {
    key: RandomGenerator.alphabets(12),
    value: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_system: true,
  } satisfies IDiscussionBoardSetting.ICreate;
  const createdSetting =
    await api.functional.discussionBoard.admin.settings.create(connection, {
      body: createInput,
    });
  typia.assert(createdSetting);

  // 3. Fetch setting details by ID
  const detailedSetting =
    await api.functional.discussionBoard.admin.settings.at(connection, {
      settingId: createdSetting.id,
    });
  typia.assert(detailedSetting);

  // 4. Validate all fields
  TestValidator.equals(
    "setting id matches",
    detailedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "setting key matches",
    detailedSetting.key,
    createInput.key,
  );
  TestValidator.equals(
    "setting value matches",
    detailedSetting.value,
    createInput.value,
  );
  TestValidator.equals(
    "setting description matches",
    detailedSetting.description,
    createInput.description,
  );
  TestValidator.equals(
    "setting is_system matches",
    detailedSetting.is_system,
    createInput.is_system,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof detailedSetting.created_at === "string" &&
      detailedSetting.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof detailedSetting.updated_at === "string" &&
      detailedSetting.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    detailedSetting.deleted_at ?? null,
    null,
  );
}
