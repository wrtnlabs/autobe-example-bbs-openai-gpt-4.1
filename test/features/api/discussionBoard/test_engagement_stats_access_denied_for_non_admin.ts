import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEngagementStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";

/**
 * Validate that engagement statistics cannot be accessed by non-admin users
 * (permission enforcement test).
 *
 * This test ensures the endpoint /discussionBoard/admin/engagementStats is
 * inaccessible for users who do not have 'admin' privileges. The API must
 * enforce proper permission checks and respond with an error (e.g., permission
 * denied/forbidden).
 *
 * Test Workflow:
 *
 * 1. Attempt to call the engagement stats endpoint using a non-admin user session
 *    (e.g., default non-privileged connection, or an unauthenticated request if
 *    user context is not available).
 * 2. Confirm that the call fails with an appropriate permission error (e.g., HTTP
 *    403 Forbidden) and does NOT leak engagement data.
 */
export async function test_api_discussionBoard_test_engagement_stats_access_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Try to fetch the engagement statistics using a non-admin session.
  await TestValidator.error("non-admin access is blocked")(async () => {
    await api.functional.discussionBoard.admin.engagementStats.index(
      connection,
    );
  });
}
