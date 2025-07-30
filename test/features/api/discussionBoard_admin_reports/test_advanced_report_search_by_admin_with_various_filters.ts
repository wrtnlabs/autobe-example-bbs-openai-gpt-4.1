import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Admin advanced search for discussion board reports: filter by reporter,
 * status, content type, and time window.
 *
 * This test ensures an administrator can execute advanced searches using the
 * board moderation reports search endpoint, including applying filters for
 * reporter, moderation status, content type, and creation timestamps.
 *
 * Steps:
 *
 * 1. Create several member accounts to serve as diverse report sources.
 * 2. Submit several reports emulating a variety of report types (post/comment),
 *    statuses ('pending'/'resolved'), and timestamps.
 * 3. Exercise the admin advanced search endpoint with different filter
 *    combinations:
 *
 *    - By reporter (reporter_id)
 *    - By moderation status ('pending'/'resolved')
 *    - By content_type ('post'/'comment')
 *    - By time window (created_from, created_to)
 * 4. For each query, assert that all returned records match the filter criteria,
 *    and validate the shape of returned summaries and pagination metadata.
 *
 * Limitations:
 *
 * - Reports can be submitted with initial status only; there's no API to patch
 *   status within this workflow, so 'resolved' status is simulated via test
 *   data, not via API.
 */
export async function test_api_discussionBoard_admin_reports_test_advanced_report_search_by_admin_with_various_filters(
  connection: api.IConnection,
) {
  // 1. Create multiple members as reporting sources
  const memberData = ArrayUtil.repeat(3)(
    () =>
      ({
        user_identifier: RandomGenerator.alphabets(8),
        joined_at: new Date().toISOString(),
      }) satisfies IDiscussionBoardMember.ICreate,
  );
  const members: IDiscussionBoardMember[] = [];
  for (const data of memberData) {
    const member = await api.functional.discussionBoard.admin.members.create(
      connection,
      { body: data },
    );
    typia.assert(member);
    members.push(member);
  }

  // 2. File a mix of report records with different reporters, types, and times
  const now = new Date();
  const reportInfo: {
    reporter: IDiscussionBoardMember;
    content_type: string;
    status: string;
    created_at: string;
  }[] = [
    // Member 0: Post report, pending, now
    {
      reporter: members[0],
      content_type: "post",
      status: "pending",
      created_at: now.toISOString(),
    },
    // Member 0: Comment report, resolved, now-2d
    {
      reporter: members[0],
      content_type: "comment",
      status: "resolved",
      created_at: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
    },
    // Member 1: Comment report, pending, now-1d
    {
      reporter: members[1],
      content_type: "comment",
      status: "pending",
      created_at: new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString(),
    },
    // Member 2: Post report, resolved, now-3d
    {
      reporter: members[2],
      content_type: "post",
      status: "resolved",
      created_at: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
    },
  ];
  const reports: IDiscussionBoardReport[] = [];
  for (const info of reportInfo) {
    const body: IDiscussionBoardReport.ICreate = {
      reporter_id: info.reporter.id,
      content_type: info.content_type,
      reported_post_id:
        info.content_type === "post"
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
      reported_comment_id:
        info.content_type === "comment"
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
      reason: RandomGenerator.paragraph()(1),
    };
    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      { body },
    );
    typia.assert(report);
    // Simulate 'resolved' status in memory for assertion, since status can't be patched by any API provided.
    reports.push({
      ...report,
      status: info.status,
      created_at: info.created_at,
    });
  }

  // 3. Test reporter_id filter
  for (const member of members) {
    const result = await api.functional.discussionBoard.admin.reports.search(
      connection,
      {
        body: {
          reporter_id: member.id,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
    typia.assert(result);
    TestValidator.predicate("all reporter match")(
      result.data.every((r) => r.reporter_id === member.id),
    );
  }

  // 4. Test status filter
  for (const status of ["pending", "resolved"]) {
    const result = await api.functional.discussionBoard.admin.reports.search(
      connection,
      {
        body: { status } satisfies IDiscussionBoardReport.IRequest,
      },
    );
    typia.assert(result);
    TestValidator.predicate("all have correct status")(
      result.data.every((r) => r.status === status),
    );
  }

  // 5. Test content_type filter
  for (const content_type of ["post", "comment"]) {
    const result = await api.functional.discussionBoard.admin.reports.search(
      connection,
      {
        body: { content_type } satisfies IDiscussionBoardReport.IRequest,
      },
    );
    typia.assert(result);
    TestValidator.predicate("all correct content_type")(
      result.data.every((r) => r.content_type === content_type),
    );
  }

  // 6. Test created_at time range filter
  const allTimes = reports.map((r) => r.created_at);
  const from = new Date(
    Math.min(...allTimes.map((t) => Date.parse(t))),
  ).toISOString();
  const to = new Date(
    Math.max(...allTimes.map((t) => Date.parse(t))),
  ).toISOString();
  const result = await api.functional.discussionBoard.admin.reports.search(
    connection,
    {
      body: {
        created_from: from,
        created_to: to,
      } satisfies IDiscussionBoardReport.IRequest,
    },
  );
  typia.assert(result);
  const times = result.data.map((r) => r.created_at);
  TestValidator.predicate("created_at within range")(
    times.every((t) => t >= from && t <= to),
  );

  // 7. Validate pagination and summary metadata structure
  TestValidator.predicate("pagination structure")(
    typeof result.pagination === "object" &&
      typeof result.pagination.current === "number" &&
      typeof result.pagination.limit === "number" &&
      typeof result.pagination.records === "number" &&
      typeof result.pagination.pages === "number",
  );
}
