import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * Validate that as an admin, retrieving the paginated list of system notices
 * returns all system and category-level notices, regardless of their status
 * (active/inactive) or schedule (scheduled in the future, expired, always
 * visible).
 *
 * Business context:
 *
 * - System notices can be global (category_id=null) or specific to a category.
 * - Notices may be active, inactive, scheduled for future, expired, or always
 *   visible.
 * - Admins must see all notices, regardless of their visibility to end-users
 *   (active/scheduled).
 *
 * Test steps:
 *
 * 1. Create diverse test notices as admin:
 *
 *    - Global notice, active & always visible
 *    - Category-level notice, inactive
 *    - Global notice, scheduled for the future
 *    - Category-level notice, expired
 * 2. Retrieve the list of notices via admin endpoint
 * 3. Assert ALL created notices are present in the response (by id)
 * 4. For each notice, validate fields (id, category_id, title, body, is_active,
 *    start_at, end_at, timestamps)
 * 5. Validate pagination and data array structure
 */
export async function test_api_discussionBoard_test_list_all_system_notices_as_admin_includes_active_inactive_and_scheduled(
  connection: api.IConnection,
) {
  // 1. Create test notices covering all business cases
  // Create: Global, active, always-visible notice
  const notice_active =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Active Global Notice",
          body: "Visible to all users.",
          is_active: true,
          category_id: null,
          start_at: null,
          end_at: null,
        },
      },
    );
  typia.assert(notice_active);

  // Create: Category-level, inactive notice
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const notice_inactive =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Inactive Category Notice",
          body: "Only visible to administrators.",
          is_active: false,
          category_id,
          start_at: null,
          end_at: null,
        },
      },
    );
  typia.assert(notice_inactive);

  // Create: Global, scheduled for future notice
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 3600 * 1000); // 1 week in future
  const notice_future =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Future Global Notice",
          body: "Scheduled notice, visible to admin before schedule.",
          is_active: true,
          category_id: null,
          start_at: future.toISOString(),
          end_at: null,
        },
      },
    );
  typia.assert(notice_future);

  // Create: Category-level, expired notice
  const past = new Date(now.getTime() - 7 * 24 * 3600 * 1000); // 1 week ago
  const notice_expired =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Expired Category Notice",
          body: "Category notice that has expired.",
          is_active: true,
          category_id,
          start_at: past.toISOString(),
          end_at: now.toISOString(),
        },
      },
    );
  typia.assert(notice_expired);

  // 2. Retrieve all notices as admin
  const page =
    await api.functional.discussionBoard.admin.systemNotices.index(connection);
  typia.assert(page);

  // 3. Assert all created notices are present
  const ids = page.data.map((n) => n.id);
  TestValidator.predicate("active admin global notice present")(
    ids.includes(notice_active.id),
  );
  TestValidator.predicate("inactive admin category notice present")(
    ids.includes(notice_inactive.id),
  );
  TestValidator.predicate("future admin global notice present")(
    ids.includes(notice_future.id),
  );
  TestValidator.predicate("expired admin category notice present")(
    ids.includes(notice_expired.id),
  );

  // 4. For each created notice, validate properties and presence
  for (const [desc, expected] of [
    ["active", notice_active],
    ["inactive", notice_inactive],
    ["future", notice_future],
    ["expired", notice_expired],
  ] as const) {
    const actual = page.data.find((n) => n.id === expected.id);
    TestValidator.predicate(`${desc} notice should be present`)(
      actual !== undefined,
    );
    if (!actual) continue;
    TestValidator.equals(`${desc} notice id`)(actual.id)(expected.id);
    TestValidator.equals(`${desc} notice category_id`)(actual.category_id)(
      expected.category_id,
    );
    TestValidator.equals(`${desc} notice title`)(actual.title)(expected.title);
    TestValidator.equals(`${desc} notice body`)(actual.body)(expected.body);
    TestValidator.equals(`${desc} notice is_active`)(actual.is_active)(
      expected.is_active,
    );
    TestValidator.equals(`${desc} notice start_at`)(actual.start_at)(
      expected.start_at,
    );
    TestValidator.equals(`${desc} notice end_at`)(actual.end_at)(
      expected.end_at,
    );
    TestValidator.predicate(`${desc} notice created_at is ISO string`)(
      typeof actual.created_at === "string",
    );
    TestValidator.predicate(`${desc} notice updated_at is ISO string`)(
      typeof actual.updated_at === "string",
    );
  }

  // 5. Validate pagination structure
  TestValidator.predicate("pagination meta present")(
    typeof page.pagination === "object",
  );
  TestValidator.predicate("notices data is array")(Array.isArray(page.data));
}
