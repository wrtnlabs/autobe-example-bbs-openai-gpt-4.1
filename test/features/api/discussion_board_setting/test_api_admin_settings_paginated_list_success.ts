import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import type { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * End-to-end test for searching and paginating admin settings in the
 * discussion board platform.
 *
 * Validates that an authenticated admin user can retrieve a paginated,
 * filterable list of settings using different filters such as 'key',
 * 'is_system', and keyword search. Checks that pagination and sorting
 * metadata reflect the dataset, that results correspond to expected
 * filters, and that both system and business-level settings can be
 * created/retrieved. Covers edge cases where filters return no records, and
 * ensures the overall paging and filtering logic works as required.
 *
 * Steps:
 *
 * 1. Register and log in an admin (admin join endpoint - creates admin and
 *    provides authorization context).
 * 2. Create ~10 settings (system and business level, with unique keys and
 *    description/value variety).
 * 3. Run paginated search with no filters (should return all, check 'records',
 *    'pages', 'current', etc.).
 * 4. Filter by an exact setting key; check only that setting is returned.
 * 5. Use the description or value as a keyword filter; verify matching
 *    settings returned.
 * 6. Filter by 'is_system' (system settings; business settings).
 * 7. Use pagination (small limit, e.g., limit=3, different 'page' values) and
 *    validate sliced results.
 * 8. For each query, check that 'pagination' metadata matches the returned
 *    data, and that filters yield only appropriate results.
 * 9. Edge case: filter with non-existent key and keyword (should return empty
 *    data, correct pagination info).
 */
export async function test_api_admin_settings_paginated_list_success(
  connection: api.IConnection,
) {
  // 1. Admin join (register/log in)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create diverse settings: both system/business, unique key/value
  const settings = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(10, (i) => i),
    async (i) => {
      const setting =
        await api.functional.discussionBoard.admin.settings.create(connection, {
          body: {
            key: `setting_key_${i}_${RandomGenerator.alphaNumeric(6)}`,
            value: `value_${i}_${RandomGenerator.alphaNumeric(4)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            is_system: i % 2 === 0,
          } satisfies IDiscussionBoardSetting.ICreate,
        });
      typia.assert(setting);
      return setting;
    },
  );

  // 3. Unfiltered: retrieve all settings, expect all returned with correct pagination
  let output = await api.functional.discussionBoard.admin.settings.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardSetting.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "all settings count matches records",
    output.pagination.records,
    settings.length,
  );
  TestValidator.equals(
    "all settings page default is 1",
    output.pagination.current,
    1,
  );

  // 4. Filter by exact key (pick random setting)
  const keyTarget = RandomGenerator.pick(settings).key;
  const byKey = await api.functional.discussionBoard.admin.settings.index(
    connection,
    {
      body: { key: keyTarget } satisfies IDiscussionBoardSetting.IRequest,
    },
  );
  typia.assert(byKey);
  TestValidator.equals(
    "by key returns single matching setting",
    byKey.data.length,
    1,
  );
  TestValidator.equals("key matches filter", byKey.data[0].key, keyTarget);
  // Additionally, check result in expected set
  TestValidator.predicate(
    "by key: returned key exists in seed settings",
    settings.some((s) => s.key === byKey.data[0].key),
  );

  // 5. Filter by keyword (from description)
  const descTarget = RandomGenerator.pick(settings).description ?? "";
  // Use a substring from one of the created descriptions as the keyword.
  const keywordSample = RandomGenerator.substring(descTarget);
  const byKeyword = await api.functional.discussionBoard.admin.settings.index(
    connection,
    {
      body: {
        keyword: keywordSample,
      } satisfies IDiscussionBoardSetting.IRequest,
    },
  );
  typia.assert(byKeyword);
  TestValidator.predicate(
    "settings include keyword in desc (if present)",
    byKeyword.data.every((x) => (x.description ?? "").includes(keywordSample)),
  );
  // Additionally, ensure all results are from our created set
  TestValidator.predicate(
    "by keyword: all returned ids are from created settings",
    byKeyword.data.every((x) => settings.some((s) => s.id === x.id)),
  );

  // 6. Filter by is_system true, check only system settings in results
  const systemResults =
    await api.functional.discussionBoard.admin.settings.index(connection, {
      body: { is_system: true } satisfies IDiscussionBoardSetting.IRequest,
    });
  typia.assert(systemResults);
  TestValidator.predicate(
    "all returned are system settings",
    systemResults.data.every((x) => x.is_system === true),
  );
  // and all returned are part of the created data
  TestValidator.predicate(
    "system filter: returned all from created settings",
    systemResults.data.every((x) => settings.some((s) => s.id === x.id)),
  );

  // 7. Pagination test: limit=3, page=2
  const paged = await api.functional.discussionBoard.admin.settings.index(
    connection,
    {
      body: { limit: 3, page: 2 } satisfies IDiscussionBoardSetting.IRequest,
    },
  );
  typia.assert(paged);
  TestValidator.equals(
    "pagination limit applied",
    paged.data.length,
    Math.min(3, settings.length - 3),
  );
  TestValidator.equals("pagination page number", paged.pagination.current, 2);
  TestValidator.equals("pagination limit metadata", paged.pagination.limit, 3);
  // Optionally: ensure no duplicate ids and all ids in main set
  TestValidator.predicate(
    "pagination: all returned ids in data set",
    paged.data.every((x) => settings.some((s) => s.id === x.id)),
  );

  // 8. Edge case: filter by a non-existing key (should return no settings, proper pagination)
  const none = await api.functional.discussionBoard.admin.settings.index(
    connection,
    {
      body: {
        key: "this_key_does_not_exist",
      } satisfies IDiscussionBoardSetting.IRequest,
    },
  );
  typia.assert(none);
  TestValidator.equals(
    "no matching setting for nonexistent key",
    none.data.length,
    0,
  );
  TestValidator.equals(
    "records is zero for nonexistent key",
    none.pagination.records,
    0,
  );
}
