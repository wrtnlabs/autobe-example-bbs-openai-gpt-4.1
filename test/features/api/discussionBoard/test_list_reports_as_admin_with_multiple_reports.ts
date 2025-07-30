import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that the admin can retrieve a full paginated list of all reports
 * after multiple submissions.
 *
 * Business context: This test simulates creation of several board members
 * (admin function), then as each member, files a report about a simulated post
 * or comment. Finally, it checks that all created reports appear in the admin
 * list, with correct summary fields and that pagination counters reflect the
 * visible data.
 *
 * Step-by-step process:
 *
 * 1. Create three discussion board members (admin API)
 * 2. As each member, file a report as either 'post' or 'comment' report (member
 *    API)
 * 3. As admin, retrieve the paginated list of all reports
 * 4. Check: each created report is present in the results, with all summary fields
 *    and correct target association
 * 5. Validate: pagination count reflects at least all created reports (accounts
 *    for pre-existing data)
 */
export async function test_api_discussionBoard_test_list_reports_as_admin_with_multiple_reports(
  connection: api.IConnection,
) {
  // 1. Create three board members (admin API)
  const members = await Promise.all(
    ArrayUtil.repeat(3)(async () => {
      const member = await api.functional.discussionBoard.admin.members.create(
        connection,
        {
          body: {
            user_identifier: RandomGenerator.alphabets(8),
            joined_at: new Date().toISOString(),
          } satisfies IDiscussionBoardMember.ICreate,
        },
      );
      typia.assert(member);
      return member;
    }),
  );

  // 2. As each member, file a report (alternate between post and comment)
  const createdReports: IDiscussionBoardReport[] = [];
  for (let i = 0; i < members.length; ++i) {
    const contentType = i % 2 === 0 ? "post" : "comment";
    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      {
        body: {
          reporter_id: members[i].id,
          content_type: contentType,
          reported_post_id:
            contentType === "post"
              ? typia.random<string & tags.Format<"uuid">>()
              : null,
          reported_comment_id:
            contentType === "comment"
              ? typia.random<string & tags.Format<"uuid">>()
              : null,
          reason: `Test report #${i + 1}`,
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
    createdReports.push(report);
  }

  // 3. As admin, fetch the full list of reports
  const list =
    await api.functional.discussionBoard.admin.reports.index(connection);
  typia.assert(list);

  // 4. Check that each created report is present and summary fields match
  for (const created of createdReports) {
    const found = list.data.find((r) => r.id === created.id);
    TestValidator.predicate(`Presence of report with id=${created.id}`)(
      !!found,
    );
    if (found) {
      TestValidator.equals("content_type")(found.content_type)(
        created.content_type,
      );
      TestValidator.equals("status")(found.status)(created.status);
      TestValidator.equals("reporter_id")(found.reporter_id)(
        created.reporter_id,
      );
      if (created.content_type === "post") {
        TestValidator.equals("target_id === reported_post_id")(found.target_id)(
          created.reported_post_id,
        );
      } else {
        TestValidator.equals("target_id === reported_comment_id")(
          found.target_id,
        )(created.reported_comment_id);
      }
    }
  }

  // 5. Validate: pagination record count is at least the number of created reports (allowing for preexisting data)
  TestValidator.predicate(
    "Pagination record count includes all created reports",
  )(list.pagination.records >= createdReports.length);
}
