import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";

/**
 * Validate API input validation and error response for engagement stat creation
 * with missing or invalid fields.
 *
 * This test attempts to create an engagement stats record for discussion board
 * analytics, omitting required fields and/or using invalid values (e.g.,
 * negative counts), to verify that the API correctly rejects invalid inputs and
 * returns errors as per business rules:
 *
 * 1. Attempt to create with missing required fields one-by-one (e.g., omit
 *    period_start, period_end, dimension, segment_value, post_count,
 *    comment_count, active_user_count, or report_count).
 *
 * - For each omitted field, assert that an error is thrown and the API does not
 *   return a successful record.
 *
 * 2. Attempt to create with negative values or non-integral numbers for counts
 *    (post_count, comment_count, active_user_count, report_count).
 *
 * - For each count field, try negative values and floating-points; assert error
 *   thrown and creation rejected.
 *
 * 3. Attempt empty-string for dimension and segment_value; expect error response.
 * 4. For all validation error scenarios, assert that the API throws an error (do
 *    not inspect error message details, only that error occurs).
 */
export async function test_api_discussionBoard_admin_engagementStats_create_test_create_engagement_stat_with_missing_or_invalid_fields_fails(
  connection: api.IConnection,
) {
  // Helper: valid payload
  const valid: IDiscussionBoardEngagementStat.ICreate = {
    period_start: typia.random<string & tags.Format<"date-time">>(),
    period_end: typia.random<string & tags.Format<"date-time">>(),
    dimension: "site",
    segment_value: "admin",
    post_count: 10,
    comment_count: 5,
    active_user_count: 2,
    report_count: 1,
  };

  // 1. Omit each required field => expect error
  for (const key of [
    "period_start",
    "period_end",
    "dimension",
    "segment_value",
    "post_count",
    "comment_count",
    "active_user_count",
    "report_count",
  ]) {
    const input = { ...valid };
    delete (input as any)[key];
    await TestValidator.error("missing required: " + key)(async () => {
      await api.functional.discussionBoard.admin.engagementStats.create(
        connection,
        { body: input as any },
      );
    });
  }

  // 2. Negative and non-integral values for count fields => expect error
  for (const key of [
    "post_count",
    "comment_count",
    "active_user_count",
    "report_count",
  ]) {
    // Negative
    const inputNeg = { ...valid, [key]: -1 };
    await TestValidator.error("negative " + key)(async () => {
      await api.functional.discussionBoard.admin.engagementStats.create(
        connection,
        { body: inputNeg },
      );
    });

    // Non-integer (floating point)
    const inputFloat = { ...valid, [key]: 1.5 };
    await TestValidator.error("float " + key)(async () => {
      await api.functional.discussionBoard.admin.engagementStats.create(
        connection,
        { body: inputFloat },
      );
    });
  }

  // 3. Empty string for string fields
  for (const key of ["dimension", "segment_value"]) {
    const input = { ...valid, [key]: "" };
    await TestValidator.error("empty string " + key)(async () => {
      await api.functional.discussionBoard.admin.engagementStats.create(
        connection,
        { body: input },
      );
    });
  }
}
