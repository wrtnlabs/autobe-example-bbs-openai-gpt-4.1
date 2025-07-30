import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate moderator retrieval of paginated content report list with results.
 *
 * This test ensures that when a moderator requests a paginated list of reports,
 * the returned data includes at least one report previously filed by a member,
 * and that all returned metadata (id, status, timestamps, reporter, target)
 * aligns with expectations and conforms to API schema. It also verifies that
 * pagination fields (current, limit, records, pages) are present and valid.
 *
 * Steps:
 *
 * 1. Create a new discussion board member via the admin endpoint. Store the
 *    member's id for linking as the report reporter.
 * 2. As the created member, file a content report (e.g., type 'post', with random
 *    valid post UUID). Store/report content_type and the (random)
 *    reported_post_id or reported_comment_id per content_type rules.
 * 3. As a moderator, fetch the list of content reports via the moderator endpoint.
 * 4. Verify:
 *
 * - Response follows IPageIDiscussionBoardReport.ISummary structure: contains
 *   pagination and data fields.
 * - Pagination info (current, limit, records, pages) has valid numbers (current
 *   >= 1, limit >= 1, records >= 1, etc., and at least one record is present).
 * - The created report is present in result data, with all expected summary
 *   fields (id, content_type, status, created_at, resolved_at, reporter_id,
 *   target_id) properly populated and correct according to what was filed.
 * - The data does not violate schema (typia.assert on all outputs).
 */
export async function test_api_discussionBoard_test_list_reports_as_moderator_with_results(
  connection: api.IConnection,
) {
  // 1. Create a new board member (admin privilege)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: typia.random<string>(),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. As the member, file a content report (type: 'post', random post id)
  const reported_post_id = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reporter_id: member.id,
        content_type: "post",
        reported_post_id,
        reason: "Inappropriate content for demonstration.",
      },
    },
  );
  typia.assert(report);

  // 3. As a moderator, fetch the list of content reports
  const page =
    await api.functional.discussionBoard.moderator.reports.index(connection);
  typia.assert(page);

  // 4. Validate pagination fields and existence of the just-created report
  const { pagination, data } = page;
  TestValidator.predicate("pagination.current is at least 1")(
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination.limit is at least 1")(
    pagination.limit >= 1,
  );
  TestValidator.predicate("pagination.records is at least 1")(
    pagination.records >= 1,
  );
  TestValidator.predicate("pagination.pages is at least 1")(
    pagination.pages >= 1,
  );
  TestValidator.predicate("at least one report is in results")(
    data.length >= 1,
  );
  // Find the filed report in the data - using id and reporter_id match
  const found = data.find(
    (d) => d.id === report.id && d.reporter_id === member.id,
  );
  TestValidator.predicate("the just-filed report is present")(!!found);
  if (found) {
    TestValidator.equals("report id matches")(found.id)(report.id);
    TestValidator.equals("reporter_id matches")(found.reporter_id)(member.id);
    TestValidator.equals("content_type matches")(found.content_type)(
      report.content_type,
    );
    TestValidator.equals("status field present")(
      typeof found.status === "string",
    )(true);
    TestValidator.equals("created_at field present")(
      typeof found.created_at === "string",
    )(true);
    // resolved_at may be null or date
    TestValidator.predicate("resolved_at field is string or null")(
      typeof found.resolved_at === "string" ||
        found.resolved_at === null ||
        found.resolved_at === undefined,
    );
    // The reported target id matches what was provided
    TestValidator.equals("target_id matches")(found.target_id)(
      reported_post_id,
    );
  }
  // Schema compliance already verified via typia.assert
}
