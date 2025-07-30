import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";

/**
 * Validate that updating a discussion board engagement stat with invalid or
 * conflicting data is rejected.
 *
 * This test ensures the system enforces schema constraints and uniqueness rules
 * when updating engagement stats via the admin analytics endpoint.
 * Specifically, it checks three prohibitions:
 *
 * 1. Negative numeric values (e.g., -10) are not allowed for count/statistics
 *    fields.
 * 2. Overlap in period/dimension/segment between stats is not permitted (i.e., you
 *    can't update a stat to a period that collides with another's period with
 *    the same dimension/segment).
 * 3. The update must include at least one real field to change — an empty update
 *    body should not be accepted.
 *
 * Workflow:
 *
 * 1. Create an initial valid stat (statA).
 * 2. Attempt to update statA with negative counts and assert that an error is
 *    thrown.
 * 3. Create another valid stat (statB) in a non-overlapping period.
 * 4. Attempt to update statA's period into statB's window and assert that an error
 *    is thrown.
 * 5. Attempt to update statA with an entirely empty body and assert that an error
 *    is thrown.
 */
export async function test_api_discussionBoard_admin_engagementStats_test_update_engagement_stat_with_conflicting_or_invalid_data_fails(
  connection: api.IConnection,
) {
  // 1. Create a valid engagement stat (statA): Jan 2025 for 'site'/'member'.
  const periodStartA: string = new Date("2025-01-01T00:00:00Z").toISOString();
  const periodEndA: string = new Date("2025-01-31T23:59:59Z").toISOString();
  const validDimension = "site";
  const validSegment = "member";

  const statA =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      {
        body: {
          period_start: periodStartA,
          period_end: periodEndA,
          dimension: validDimension,
          segment_value: validSegment,
          post_count: 20,
          comment_count: 50,
          active_user_count: 12,
          report_count: 1,
          topic_id: null,
        } satisfies IDiscussionBoardEngagementStat.ICreate,
      },
    );
  typia.assert(statA);

  // 2. Attempt to update statA with a negative post_count - should error.
  await TestValidator.error("Negative post_count should fail")(() =>
    api.functional.discussionBoard.admin.engagementStats.update(connection, {
      engagementStatId: statA.id,
      body: {
        post_count: -10,
      } satisfies IDiscussionBoardEngagementStat.IUpdate,
    }),
  );

  // 3. Create a separate, non-overlapping stat (statB): Feb 2025, same dimension/segment.
  const periodStartB: string = new Date("2025-02-01T00:00:00Z").toISOString();
  const periodEndB: string = new Date("2025-02-28T23:59:59Z").toISOString();
  const statB =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      {
        body: {
          period_start: periodStartB,
          period_end: periodEndB,
          dimension: validDimension,
          segment_value: validSegment,
          post_count: 22,
          comment_count: 33,
          active_user_count: 8,
          report_count: 0,
          topic_id: null,
        } satisfies IDiscussionBoardEngagementStat.ICreate,
      },
    );
  typia.assert(statB);

  // 4. Attempt to update statA to overlap statB's period — should error due to uniqueness constraint.
  await TestValidator.error("Period overlap update should fail")(() =>
    api.functional.discussionBoard.admin.engagementStats.update(connection, {
      engagementStatId: statA.id,
      body: {
        period_start: periodStartB,
        period_end: periodEndB,
      } satisfies IDiscussionBoardEngagementStat.IUpdate,
    }),
  );

  // 5. Attempt to update statA with an empty body — should be rejected.
  await TestValidator.error("Empty update body should fail")(() =>
    api.functional.discussionBoard.admin.engagementStats.update(connection, {
      engagementStatId: statA.id,
      body: {} as IDiscussionBoardEngagementStat.IUpdate,
    }),
  );
}
