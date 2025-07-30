import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates the advanced search functionality for moderator report queries on
 * the board.
 *
 * This test ensures that a moderator can use combinations of filters—status,
 * content_type, reporter_id, and creation date window—to accurately refine
 * report search results. It also verifies filtering correctness and pagination
 * behavior.
 *
 * Steps:
 *
 * 1. Register multiple members (to act as reporters and for diversity).
 * 2. Submit several reports varying by:
 *
 *    - Status (pending, resolved, reviewed)
 *    - Content_type (post, comment)
 *    - Reporter_id
 *    - Created_at (simulate different dates)
 * 3. As a moderator, use: a. status filter (e.g., only pending) b. content_type
 *    filter (e.g., only comments) c. reporter_id filter (target one or several
 *    specific members) d. Date window filter (created_from/created_to)
 * 4. For each filter, assert:
 *
 *    - Results returned only include records matching filter(s)
 *    - Pagination returns correct page counts/limits
 *    - When a filter excludes all, results are empty (edge case)
 */
export async function test_api_discussionBoard_test_advanced_report_search_by_moderator_with_filters(
  connection: api.IConnection,
) {
  // Step 1. Register 3 different members
  const members: IDiscussionBoardMember[] = [];
  for (let i = 0; i < 3; ++i) {
    const member = await api.functional.discussionBoard.admin.members.create(
      connection,
      {
        body: {
          user_identifier: RandomGenerator.alphaNumeric(10),
          joined_at: new Date(Date.now() - i * 86400000).toISOString(),
        },
      },
    );
    typia.assert(member);
    members.push(member);
  }

  // Step 2. Each member files multiple reports with variety in type and time
  // Simulate 2 different content types and set creation within range
  const statuses = ["pending", "resolved", "reviewed"];
  const contentTypes = ["post", "comment"];
  const now = Date.now();
  const reports: (IDiscussionBoardReport & {
    status: string;
    created_at: string;
  })[] = [];
  for (let i = 0; i < members.length; ++i) {
    for (let j = 0; j < 4; ++j) {
      // 4 reports per member
      const content_type = contentTypes[j % contentTypes.length];
      const fakeContentId = typia.random<string & tags.Format<"uuid">>();
      const baseCreated = new Date(
        now - (i * 3 + j) * 3600 * 1000,
      ).toISOString();
      const report = await api.functional.discussionBoard.member.reports.create(
        connection,
        {
          body: {
            reporter_id: members[i].id,
            content_type,
            reported_post_id: content_type === "post" ? fakeContentId : null,
            reported_comment_id:
              content_type === "comment" ? fakeContentId : null,
            reason: `Reason ${i}-${j}`,
          },
        },
      );
      typia.assert(report);
      // Simulate updating report status and created_at, since API doesn't expose these on creation
      reports.push({
        ...report,
        status: statuses[(i + j) % statuses.length],
        created_at: baseCreated,
      });
    }
  }

  // Helper for searching as moderator
  async function searchReports(body: IDiscussionBoardReport.IRequest) {
    const output =
      await api.functional.discussionBoard.moderator.reports.search(
        connection,
        { body },
      );
    typia.assert(output);
    return output.data;
  }

  // Step 3a. Filter: by status
  const pendingReports = reports.filter((r) => r.status === "pending");
  let searchResult = await searchReports({ status: "pending" });
  TestValidator.equals("pending reports count")(searchResult.length)(
    pendingReports.length,
  );
  searchResult.forEach((r) =>
    TestValidator.equals("status is pending")(r.status)("pending"),
  );

  // Step 3b. Filter: by content type
  const commentReports = reports.filter((r) => r.content_type === "comment");
  searchResult = await searchReports({ content_type: "comment" });
  TestValidator.equals("comment reports count")(searchResult.length)(
    commentReports.length,
  );
  searchResult.forEach((r) =>
    TestValidator.equals("content_type is comment")(r.content_type)("comment"),
  );

  // Step 3c. Filter: by reporter_id
  for (const member of members) {
    const theirReports = reports.filter((r) => r.reporter_id === member.id);
    searchResult = await searchReports({ reporter_id: member.id });
    TestValidator.equals(`reports for ${member.id}`)(searchResult.length)(
      theirReports.length,
    );
    searchResult.forEach((r) =>
      TestValidator.equals("correct reporter_id")(r.reporter_id)(member.id),
    );
  }

  // Step 3d. Date window filter: pick reports from recent 6 hours
  const sixHrAgo = new Date(now - 6 * 3600 * 1000).toISOString();
  const recentReports = reports.filter((r) => r.created_at >= sixHrAgo);
  searchResult = await searchReports({ created_from: sixHrAgo });
  TestValidator.equals("reports from last 6 hours")(searchResult.length)(
    recentReports.length,
  );

  // Step 4. Pagination: limit to 2
  searchResult = await searchReports({ limit: 2, page: 1 });
  TestValidator.equals("pagination limit 2")(searchResult.length)(
    Math.min(2, reports.length),
  );

  // Step 5. Filter yields no results (edge)
  searchResult = await searchReports({
    status: "resolved",
    content_type: "none-exist-type",
  });
  TestValidator.equals("filter returns none")(searchResult.length)(0);
}
