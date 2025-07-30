import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";
import type { IPageIDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEngagementStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search for engagement statistics with specific filter
 * parameters and pagination.
 *
 * Business context: This test ensures that an admin can apply a variety of
 * filters (date range, dimension, segment) and use pagination options in the
 * analytics dashboard to fetch only matching engagement statistics, as well as
 * boundary conditions for pagination and record filtering.
 *
 * Step-by-step process:
 *
 * 1. Insert multiple distinct engagement statistics records via the admin API,
 *    ensuring some records are designed to match certain filters and others do
 *    not.
 * 2. Perform a search using precise filter parameters (e.g., pick
 *    period_start_from/period_end_to to include only a portion of the records,
 *    select specific dimension, segment_value, topic_id where feasible).
 * 3. Validate that all records in the response strictly match the applied filters
 *    and none are outside the range.
 * 4. Test pagination: set page and limit, confirm correct number of records per
 *    page and proper page info (boundary: last page).
 * 5. Test with multiple sets of filters, including filtering by topic, dimension,
 *    segment, and a combination for full path coverage.
 */
export async function test_api_discussionBoard_admin_engagementStats_test_search_engagement_stats_with_valid_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Insert three engagement stat records with distinct period, topic, dimension, and segment values
  const baseDate = new Date();
  const topic1 = typia.random<string & tags.Format<"uuid">>();
  const topic2 = typia.random<string & tags.Format<"uuid">>();

  // Record A (topic1, 'site', 'admin', period: today-10 to today-5)
  const recordA =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      {
        body: {
          topic_id: topic1,
          period_start: new Date(
            baseDate.getTime() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          period_end: new Date(
            baseDate.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          dimension: "site",
          segment_value: "admin",
          post_count: 20,
          comment_count: 10,
          active_user_count: 5,
          report_count: 1,
        },
      },
    );
  typia.assert(recordA);

  // Record B (topic2, 'topic', 'member', period: today-7 to today-2)
  const recordB =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      {
        body: {
          topic_id: topic2,
          period_start: new Date(
            baseDate.getTime() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          period_end: new Date(
            baseDate.getTime() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          dimension: "topic",
          segment_value: "member",
          post_count: 30,
          comment_count: 15,
          active_user_count: 7,
          report_count: 2,
        },
      },
    );
  typia.assert(recordB);

  // Record C (no topic, 'role', 'guest', period: today-15 to today-10)
  const recordC =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      {
        body: {
          topic_id: null,
          period_start: new Date(
            baseDate.getTime() - 15 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          period_end: new Date(
            baseDate.getTime() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          dimension: "role",
          segment_value: "guest",
          post_count: 12,
          comment_count: 8,
          active_user_count: 4,
          report_count: 0,
        },
      },
    );
  typia.assert(recordC);

  // 2. Search: Filter by topic1 and period covering only recordA
  const pageResA =
    await api.functional.discussionBoard.admin.engagementStats.search(
      connection,
      {
        body: {
          topic_id: topic1,
          period_start_from: recordA.period_start,
          period_end_to: recordA.period_end,
          dimension: "site",
          segment_value: "admin",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(pageResA);
  TestValidator.predicate("Record count matches filter")(
    pageResA.data.length === 1,
  );
  TestValidator.equals("Matched id == recordA")(pageResA.data[0].id)(
    recordA.id,
  );

  // 3. Search: Filter by segment_value 'member', dimension 'topic' (should match recordB only)
  const pageResB =
    await api.functional.discussionBoard.admin.engagementStats.search(
      connection,
      {
        body: {
          segment_value: "member",
          dimension: "topic",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(pageResB);
  // There may be just one that matches since topic_id and time range are not limited
  TestValidator.predicate("RecordB matches filter")(
    pageResB.data.some((x) => x.id === recordB.id),
  );

  // 4. Search: Pagination - set limit=1, test first and second page
  const pageResPag1 =
    await api.functional.discussionBoard.admin.engagementStats.search(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(pageResPag1);
  TestValidator.equals("Page 1 limit 1")(pageResPag1.data.length)(1);
  TestValidator.equals("Current page == 1")(pageResPag1.pagination.current)(1);

  const pageResPag2 =
    await api.functional.discussionBoard.admin.engagementStats.search(
      connection,
      {
        body: {
          page: 2,
          limit: 1,
        },
      },
    );
  typia.assert(pageResPag2);
  TestValidator.equals("Page 2 limit 1")(pageResPag2.data.length)(1);
  TestValidator.equals("Current page == 2")(pageResPag2.pagination.current)(2);

  // 5. Search: by topic=null (should find recordC)
  const pageResNullTopic =
    await api.functional.discussionBoard.admin.engagementStats.search(
      connection,
      {
        body: {
          topic_id: null,
        },
      },
    );
  typia.assert(pageResNullTopic);
  TestValidator.predicate("recordC found for topic=null")(
    pageResNullTopic.data.some((x) => x.id === recordC.id),
  );

  // (Edge) 6. Search: date filter outside range, should return no results
  const pageResEmpty =
    await api.functional.discussionBoard.admin.engagementStats.search(
      connection,
      {
        body: {
          period_start_from: new Date(
            baseDate.getTime() + 1000 * 60 * 60 * 24 * 100,
          ).toISOString(), // Far future
        },
      },
    );
  typia.assert(pageResEmpty);
  TestValidator.equals("empty results outside range")(pageResEmpty.data.length)(
    0,
  );
}
