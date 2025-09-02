import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Test the successful soft deletion of a discussion board system setting by
 * an admin.
 *
 * This test validates that an admin can perform a soft delete on a
 * system/business setting via the dedicated admin endpoint. It simulates a
 * complete, isolated workflow:
 *
 * 1. Register an admin account using /auth/admin/join, confirming
 *    authentication context
 * 2. Create a new discussion board setting (randomized key/value/description)
 * 3. Soft delete (logical deletion) the setting using DELETE
 *    /discussionBoard/admin/settings/{settingId}
 * 4. Assert before deletion that deleted_at is null/undefined; after deletion,
 *    note further API verification is not possible unless a "get setting by
 *    ID (including deleted)" endpoint is available.
 *
 * Preconditions:
 *
 * - No external or pre-existing data/state is assumed
 * - The test is self-contained and idempotent
 *
 * Limitations:
 *
 * - Further verification of the deleted state in persistent storage is not
 *   implemented because no direct query endpoint is available in the
 *   current SDK
 * - If/when such API support exists, an additional step should fetch the
 *   setting by id and assert deleted_at is set
 *
 * All business rule validations, type assertions, and best practices are
 * applied.
 */
export async function test_api_admin_setting_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register admin account (simulate elevated privileges)
  const adminPayload = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardAdmin.ICreate;
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: adminPayload,
  });
  typia.assert(adminResult);
  TestValidator.predicate(
    "admin account is active",
    adminResult.admin.is_active === true,
  );

  // 2. Create a new setting entry as this admin
  const settingInput = {
    key: RandomGenerator.alphaNumeric(10),
    value: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: Math.random() < 0.5,
  } satisfies IDiscussionBoardSetting.ICreate;
  const setting = await api.functional.discussionBoard.admin.settings.create(
    connection,
    { body: settingInput },
  );
  typia.assert(setting);
  TestValidator.equals(
    "created setting key matches input",
    setting.key,
    settingInput.key,
  );
  TestValidator.predicate(
    "setting is not deleted before deletion",
    setting.deleted_at === null || setting.deleted_at === undefined,
  );

  // 3. Soft delete the created setting
  await api.functional.discussionBoard.admin.settings.erase(connection, {
    settingId: setting.id,
  });

  // 4. Further verification (if retrieval endpoint existed, would check deleted_at is set)
  //    At present, document limitation and ensure audit traces as per test purpose
}
