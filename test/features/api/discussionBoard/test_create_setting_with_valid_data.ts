import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Validate admin creation of a new discussion board setting with unique key,
 * valid value, and optional description.
 *
 * Business context: An authorized admin can create a discussion board system
 * setting, which allows them to configure board options, policy toggles, or
 * global parameters by specifying a unique key, a value, and (optionally) a
 * description. This operation must only succeed for a logged-in admin user with
 * proper permissions. Upon creation, the API enforces key uniqueness and stores
 * the full configuration record, including metadata such as id and timestamps.
 * Audit logging is performed by the backend, but unless an API for audit log
 * inspection exists, test verification is limited to response validation.
 *
 * Step-by-step process:
 *
 * 1. Assume the caller (admin) is authenticated and authorized
 * 2. Prepare a unique setting_key, valid setting_value, and include a test
 *    description
 * 3. Call the POST /discussionBoard/admin/settings API to create the new setting
 * 4. Validate that the response includes a valid id (uuid), correct echo of input
 *    fields, and ISO 8601 timestamps for creation and update
 * 5. (If possible) Audit log could be tested—skipped if no API for this
 */
export async function test_api_discussionBoard_test_create_setting_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Assume admin user is already logged in/configured in connection

  // 2. Prepare a unique setting key, standard value, and description for reproducibility
  const setting_key = `test_key_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const setting_value = "enabled";
  const description = "E2E test setting for admin discussion board.";

  // 3. Create new setting
  const result = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: {
        setting_key,
        setting_value,
        description,
      } satisfies IDiscussionBoardSetting.ICreate,
    },
  );
  typia.assert(result);

  // 4. Validate identity, values, and timestamps
  TestValidator.predicate("id is uuid")(
    typeof result.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        result.id,
      ),
  );
  TestValidator.equals("setting_key matches")(result.setting_key)(setting_key);
  TestValidator.equals("setting_value matches")(result.setting_value)(
    setting_value,
  );
  TestValidator.equals("description matches")(result.description)(description);
  TestValidator.predicate("created_at is ISO string")(
    typeof result.created_at === "string" &&
      !isNaN(Date.parse(result.created_at)),
  );
  TestValidator.predicate("updated_at is ISO string")(
    typeof result.updated_at === "string" &&
      !isNaN(Date.parse(result.updated_at)),
  );
}
