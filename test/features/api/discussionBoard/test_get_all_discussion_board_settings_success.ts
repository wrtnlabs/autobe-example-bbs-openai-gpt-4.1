import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Validate successful admin retrieval of all discussion board settings.
 *
 * Business context: An admin needs visibility into the current configuration
 * settings of the discussion board. This endpoint powers the admin UI for
 * configuration management. Listings should be paginated and each entry must
 * fully represent the persisted setting state.
 *
 * Step-by-step process:
 *
 * 1. Prepopulate the system with multiple discussion board settings with diverse
 *    keys, values, and description/null (by POST).
 * 2. Retrieve the settings list as admin using the GET endpoint under test.
 * 3. Assert the response is a valid paginated settings container.
 * 4. For each created setting, ensure it is present in the returned data and all
 *    fields match (including handling of nulls, special chars).
 * 5. Validate each entry's id is uuid v4, timestamps are ISO strings, and
 *    description null is handled.
 * 6. Confirm the pagination meta is present and consistent with inserted settings.
 */
export async function test_api_discussionBoard_test_get_all_discussion_board_settings_success(
  connection: api.IConnection,
) {
  // Step 1: Prepopulate with diverse settings
  const settingsToCreate = [
    {
      setting_key: `registration_open_${RandomGenerator.alphaNumeric(4)}`,
      setting_value: "true",
      description: "회원가입 오픈 여부 (테스트)",
    },
    {
      setting_key: `max_post_length_${RandomGenerator.alphaNumeric(4)}`,
      setting_value: "10000",
      description: "최대 게시글 길이 제한 (테스트)",
    },
    {
      setting_key: `welcome_message_${RandomGenerator.alphaNumeric(4)}`,
      setting_value: "\uD83D\uDC4B Welcome! 글을 자유롭게 남겨보세요.",
      description: null,
    },
  ];
  const createdSettings: IDiscussionBoardSetting[] = [];
  for (const createBody of settingsToCreate) {
    const created = await api.functional.discussionBoard.admin.settings.create(
      connection,
      {
        body: createBody,
      },
    );
    typia.assert(created);
    createdSettings.push(created);
  }
  // Step 2: Retrieve all settings via GET
  const output =
    await api.functional.discussionBoard.admin.settings.index(connection);
  typia.assert(output);
  // Step 3: For each created setting, ensure it is present with all data correct
  for (const created of createdSettings) {
    const found = output.data.find(
      (s) => s.setting_key === created.setting_key,
    );
    TestValidator.predicate(`Created key exists: ${created.setting_key}`)(
      !!found,
    );
    if (!found) throw new Error(`Setting not found: ${created.setting_key}`);
    TestValidator.equals(
      `setting_value matches for key ${created.setting_key}`,
    )(found.setting_value)(created.setting_value);
    TestValidator.equals(`description matches for key ${created.setting_key}`)(
      found.description,
    )(created.description);
    TestValidator.predicate("created_at is ISO string")(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.[\d]+Z$/.test(found.created_at),
    );
    TestValidator.predicate("updated_at is ISO string")(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.[\d]+Z$/.test(found.updated_at),
    );
    TestValidator.predicate("id is uuid v4")(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        found.id,
      ),
    );
  }
  // Step 4: Confirm pagination meta
  TestValidator.predicate("pagination exists")(!!output.pagination);
  TestValidator.predicate("pagination current > 0")(
    output.pagination.current > 0,
  );
  TestValidator.predicate("pagination limit > 0")(output.pagination.limit > 0);
  TestValidator.predicate("pagination records >= new settings count")(
    output.pagination.records >= createdSettings.length,
  );
  TestValidator.predicate("pagination pages >= 1")(
    output.pagination.pages >= 1,
  );
}
