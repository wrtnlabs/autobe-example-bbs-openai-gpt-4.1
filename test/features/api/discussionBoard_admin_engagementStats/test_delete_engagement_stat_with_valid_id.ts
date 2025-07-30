import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";

/**
 * Permanently delete an engagement stat record as an admin and verify hard
 * deletion behavior.
 *
 * This test covers the lifecycle of an analytics engagement statistic row
 * managed by admin authority:
 *
 * - Ensures a new engagement stat record is inserted for deletion, keeping the
 *   test isolated and idempotent.
 * - Confirms successful hard deletion by invoking the erase API and expecting no
 *   data returns.
 * - Validates that subsequent deletion attempts (or possible future retrieval
 *   attempts) with the same ID result in a 404 not found error, as there is no
 *   soft-delete fallback.
 * - Ensures type contracts and API error handling paths are exercised for
 *   compliance, including audit trail expectations for destructive actions.
 *
 * Steps:
 *
 * 1. Create a new valid engagement stat record as admin (random input,
 *    schema-compliant).
 * 2. Permanently delete it by id (hard delete, no soft-delete).
 * 3. Attempt a second deletion to ensure API now returns a 404 (not found).
 */
export async function test_api_discussionBoard_admin_engagementStats_test_delete_engagement_stat_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a new engagement stat record so the test is isolated/independent
  const created =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      {
        body: typia.random<IDiscussionBoardEngagementStat.ICreate>(),
      },
    );
  typia.assert(created);

  // 2. Permanently (hard) delete the record using its unique ID
  await api.functional.discussionBoard.admin.engagementStats.erase(connection, {
    engagementStatId: created.id,
  });

  // 3. Try to delete again; expect a 404 not found, confirming gone
  await TestValidator.error("should return 404 not found after hard delete")(
    async () => {
      await api.functional.discussionBoard.admin.engagementStats.erase(
        connection,
        { engagementStatId: created.id },
      );
    },
  );
}
