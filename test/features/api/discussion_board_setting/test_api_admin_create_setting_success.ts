import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * E2E test that validates the successful creation of a new discussion board
 * setting by an admin account.
 *
 * Business context:
 *
 * - Only privileged admins can create new system/business configuration
 *   settings (e.g., feature flags, operational limits).
 * - A valid admin must exist, be authenticated using the join API, and
 *   perform the POST operation with all required setting fields.
 *
 * Test process:
 *
 * 1. Register (join) an admin account (establish admin authentication
 *    context).
 * 2. Prepare a setting payload with a unique key and value, and randomly
 *    assign is_system and (nullable) description.
 * 3. Call the create-setting API as admin, submitting the payload.
 * 4. Verify the API response structure:
 *
 *    - Ensure type is correct (typia.assert)
 *    - Confirm all response values match the input (key, value, is_system,
 *         description)
 * 5. (If listing/search APIs are available, verify the new setting is included
 *    after creation; otherwise, ensure persistence by inspecting returned
 *    record).
 */
export async function test_api_admin_create_setting_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin account, obtaining authorization
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const joinResp = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(joinResp);
  TestValidator.predicate(
    "admin join response must be is_active",
    joinResp.admin.is_active === true,
  );

  // 2. Prepare a unique setting payload
  const uniqueKey = `test_setting_${RandomGenerator.alphaNumeric(12)}`;
  const value = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 12,
  });
  // Randomly choose is_system true/false
  const isSystem = Math.random() < 0.5;
  // Optionally provide a description, or null
  const description =
    Math.random() < 0.5 ? RandomGenerator.paragraph({ sentences: 2 }) : null;
  const payload = {
    key: uniqueKey,
    value: value,
    description: description,
    is_system: isSystem,
  } satisfies IDiscussionBoardSetting.ICreate;

  // 3. Create the setting as admin
  const created = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: payload,
    },
  );
  typia.assert(created);

  // 4. Validate response fields
  TestValidator.equals("setting key matches input", created.key, payload.key);
  TestValidator.equals(
    "setting value matches input",
    created.value,
    payload.value,
  );
  TestValidator.equals(
    "setting description matches input",
    created.description,
    payload.description,
  );
  TestValidator.equals(
    "setting is_system matches input",
    created.is_system,
    payload.is_system,
  );
  TestValidator.predicate(
    "setting id is uuid",
    typeof created.id === "string" && created.id.length > 0,
  );

  // 5. Additional: ensure setting is retrievable (if list/search is available)
  // (No list/search operation is provided, so omit this step.)
}
