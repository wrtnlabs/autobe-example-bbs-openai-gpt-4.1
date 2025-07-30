import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate searching for discussion board admins using both active state and
 * grant date window filters.
 *
 * Business context: Admin listing and privilege audit panels must accurately
 * filter admins based on 'currently active' (revoked_at = null) and those whose
 * grant (assignment) happened in a specific period. This is essential for
 * compliance, privilege reviews, and behavioral analysis on the management
 * platform.
 *
 * Test steps:
 *
 * 1. Create several admin records with distinct grant/revoked_at timestamps:
 *
 *    - Some with revoked_at = null (active), others with revoked_at set (inactive)
 *    - Spread grant dates across a window before/during/after the filter period
 * 2. Formulate a search request with:
 *
 *    - Granted_at_from/granted_at_to spanning a window that covers only some created
 *         records
 *    - Revoked_at_from/revoked_at_to unset (not used in this test)
 * 3. Send the PATCH /discussionBoard/admin/admins request for search
 * 4. Assert:
 *
 *    - All returned admins are active (revoked_at is null)
 *    - All have grant (granted_at) inside the period (inclusive)
 *    - No extra records are present
 *    - Paging and data structure are as expected
 * 5. Edge: Test a second page if enough records exist (pagination)
 */
export async function test_api_discussionBoard_admin_admins_test_search_admins_by_active_state_and_granted_date_range(
  connection: api.IConnection,
) {
  // 1. Create admins with different states and grant/revoke dates
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const twentyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 20); // 20 days ago
  const fifteenDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 15); // 15 days ago
  const tenDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10); // 10 days ago

  // Create eligible admin: granted in filter, active
  const adminInFilterActive =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphabets(8),
        granted_at: twentyDaysAgo.toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminInFilterActive);

  // Create ineligible admin: granted before filter window, active
  const adminBeforeFilterActive =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphabets(8),
        granted_at: thirtyDaysAgo.toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminBeforeFilterActive);

  // Create ineligible admin: granted in filter, but revoked (inactive)
  const adminInFilterRevoked =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphabets(8),
        granted_at: fifteenDaysAgo.toISOString(),
        revoked_at: now.toISOString(),
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminInFilterRevoked);

  // Create ineligible admin: granted after filter window, active
  const adminAfterFilterActive =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphabets(8),
        granted_at: tenDaysAgo.toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminAfterFilterActive);

  // 2. Search for active admins granted within filter window
  // Filter: granted_at_from = 20 days ago, granted_at_to = 15 days ago
  const grantedAtFrom = twentyDaysAgo.toISOString();
  const grantedAtTo = fifteenDaysAgo.toISOString();

  const searchResult = await api.functional.discussionBoard.admin.admins.search(
    connection,
    {
      body: {
        user_identifier: null,
        granted_at_from: grantedAtFrom,
        granted_at_to: grantedAtTo,
        revoked_at_from: null,
        revoked_at_to: null,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(searchResult);

  // 3. Assert that all returned admins are active AND within grant window
  for (const admin of searchResult.data) {
    TestValidator.equals("revoked_at is null")(admin.revoked_at)(null);
    TestValidator.predicate("granted_at in filter window")(
      admin.granted_at >= grantedAtFrom && admin.granted_at <= grantedAtTo,
    );
  }

  // 4. Assert pagination
  TestValidator.equals("page is 1")(searchResult.pagination.current)(1);
  TestValidator.equals("limit is 100")(searchResult.pagination.limit)(100);
  TestValidator.predicate("pages positive")(searchResult.pagination.pages > 0);
  TestValidator.predicate("records nonnegative")(
    searchResult.pagination.records >= searchResult.data.length,
  );

  // 5. Only the eligible admin should be present
  const expectedUids = [adminInFilterActive.user_identifier];
  TestValidator.equals("returned count")(searchResult.data.length)(
    expectedUids.length,
  );
  for (const rec of searchResult.data) {
    TestValidator.predicate("data expected")(
      expectedUids.includes(rec.user_identifier),
    );
  }
}
