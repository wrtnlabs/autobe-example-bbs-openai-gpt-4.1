import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Verify system behavior when attempting to update a discussion board setting
 * with an invalid or non-existent settingId.
 *
 * This test ensures that when an admin user attempts to update a board setting
 * using either a non-existent UUID or a malformed identifier, the system
 * responds appropriately:
 *
 * - Returns a 'not found' (404) or validation error (4xx/5xx) without altering
 *   any records
 * - Triggers audit logging for the failed update attempt (side effect; cannot be
 *   directly asserted here)
 * - No setting is created nor modified by this operation
 *
 * Steps:
 *
 * 1. (Precondition) Assume an authenticated admin connection is present.
 * 2. Attempt to update a setting using a syntactically valid but non-existent UUID
 *    as settingId.
 *
 *    - Expect a not found (404) error response and ensure no resource is changed.
 * 3. Attempt to update a setting using an obviously malformed settingId (not a
 *    UUID).
 *
 *    - Expect a validation error (typically 400) response and ensure no resource is
 *         changed.
 * 4. Optionally, test that a successful update with a real settingId (when
 *    properly used) does not throw error, but this is excluded from this test
 *    as the intent is to cover invalid ID cases.
 */
export async function test_api_discussionBoard_test_update_setting_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Assume admin authentication present in `connection` (setup is a test suite responsibility)

  // 2. Attempt update with non-existent UUID
  const invalidUuid = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IDiscussionBoardSetting.IUpdate = {
    setting_value: "updated value",
    description: "Trying to update setting with invalid ID",
  };
  await TestValidator.error("update with non-existent UUID returns error")(() =>
    api.functional.discussionBoard.admin.settings.update(connection, {
      settingId: invalidUuid,
      body: updateBody,
    }),
  );

  // 3. Attempt update with malformed settingId (not a UUID)
  const malformedId = "not-a-uuid";
  await TestValidator.error("update with malformed ID returns error")(() =>
    api.functional.discussionBoard.admin.settings.update(connection, {
      settingId: malformedId as string & tags.Format<"uuid">, // intentionally wrong
      body: updateBody,
    }),
  );
}
