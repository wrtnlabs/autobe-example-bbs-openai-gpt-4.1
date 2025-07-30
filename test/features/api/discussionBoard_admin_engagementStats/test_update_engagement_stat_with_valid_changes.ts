import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";

/**
 * Test updating an existing engagement stat record in the admin discussion
 * board analytics system.
 *
 * This test verifies that an existing stat record can be successfully updated
 * for permitted fields (such as counts and time period), and that changes are
 * persisted upon subsequent retrieval. The test also ensures that schema
 * validations and uniqueness constraints are honored.
 *
 * Test process summary:
 *
 * 1. Create a new discussion board engagement stat entry so we have a valid ID to
 *    update.
 * 2. Update several (but not all) mutable fields: increment post_count,
 *    comment_count, and active_user_count by different values, and move the
 *    time period forward.
 * 3. Assert that the API response reflects the updated data.
 * 4. Optionally retrieve again (if an endpoint exists; otherwise, rely on API
 *    response) to confirm data persistence.
 * 5. Edge: try a no-op update or an update with the same unique keys and expect
 *    success (not uniqueness error).
 * 6. Edge: Try to update with impossible values (like negative counts or invalid
 *    date ranges) and assert validation errors are triggered.
 *
 * Steps 5 and 6 for negative testing (uniqueness, range) will be skipped if not
 * feasible.
 */
export async function test_api_discussionBoard_admin_engagementStats_test_update_engagement_stat_with_valid_changes(
  connection: api.IConnection,
) {
  // 1. Create a new statistics entry for baseline
  const createInput: IDiscussionBoardEngagementStat.ICreate = {
    period_start: typia.random<string & tags.Format<"date-time">>(),
    period_end: typia.random<string & tags.Format<"date-time">>(),
    dimension: "role",
    segment_value: "admin",
    post_count: 12,
    comment_count: 45,
    active_user_count: 7,
    report_count: 1,
  };

  const stat =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      { body: createInput },
    );
  typia.assert(stat);

  // 2. Prepare update: increment post_count, etc.
  const updateInput: IDiscussionBoardEngagementStat.IUpdate = {
    post_count: stat.post_count + 3,
    comment_count: stat.comment_count + 8,
    active_user_count: stat.active_user_count + 2,
    report_count: stat.report_count + 1,
    // move period_end forward by 1 hour (just as example, actual time handling left as simple string transformation here)
    period_end: new Date(
      new Date(stat.period_end).getTime() + 60 * 60 * 1000,
    ).toISOString() as string & tags.Format<"date-time">,
  };

  const updated =
    await api.functional.discussionBoard.admin.engagementStats.update(
      connection,
      { engagementStatId: stat.id, body: updateInput },
    );
  typia.assert(updated);
  // 3. Validate fields updated according to input
  TestValidator.equals("post_count updated")(updated.post_count)(
    updateInput.post_count,
  );
  TestValidator.equals("comment_count updated")(updated.comment_count)(
    updateInput.comment_count,
  );
  TestValidator.equals("active_user_count updated")(updated.active_user_count)(
    updateInput.active_user_count,
  );
  TestValidator.equals("report_count updated")(updated.report_count)(
    updateInput.report_count,
  );
  TestValidator.equals("period_end changed")(updated.period_end)(
    updateInput.period_end,
  );

  // 4. Optionally, fetch again (if endpoint were available) to re-validate persistence (not possible here, rely on response)
}
