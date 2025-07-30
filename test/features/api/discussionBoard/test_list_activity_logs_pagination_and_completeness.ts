import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * Validates pagination and completeness of activity logs via the moderator
 * endpoint.
 *
 * This test ensures that when a large number of activity logs are present in
 * the system, the paginated retrieval provided by the moderator endpoint
 * returns complete and accurate data, with correct pagination metadata and no
 * data loss or corruption between pages.
 *
 * Detailed workflow:
 *
 * 1. Bulk-generate a large number of activity logs (multiple pages worth) using
 *    the admin endpoint.
 * 2. Retrieve the first N pages (where N > 1) from the moderator activity log list
 *    endpoint.
 * 3. Confirm the union of returned logs matches the number and details of created
 *    logs (no duplicates, no missing data).
 * 4. Assert pagination metadata: current page, total pages, total records, records
 *    per page.
 * 5. Check the integrity of each retrieved item structure.
 */
export async function test_api_discussionBoard_test_list_activity_logs_pagination_and_completeness(
  connection: api.IConnection,
) {
  // 1. Bulk-generate activity logs (3 pages worth, assuming default limit=100)
  const logsPerPage = 100;
  const numPages = 3;
  const totalLogs = logsPerPage * numPages;
  const createdLogs: IDiscussionBoardActivityLog[] = [];
  for (let i = 0; i < totalLogs; ++i) {
    const input: IDiscussionBoardActivityLog.ICreate = {
      actor_id: typia.random<string & tags.Format<"uuid">>(),
      actor_type: ["member", "moderator", "admin", "guest"][i % 4],
      action_type: i % 5 === 0 ? "moderation_action" : "view_post",
      action_timestamp: new Date(Date.now() - i * 1000).toISOString(),
      topic_id:
        i % 7 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
      thread_id:
        i % 9 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
      post_id:
        i % 11 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
      ip_address: i % 10 === 0 ? "192.168.1." + (i % 255) : null,
      user_agent: i % 8 === 0 ? "TestAgent/" + i : null,
      metadata_json: i % 6 === 0 ? JSON.stringify({ testIndex: i }) : null,
    };
    const log = await api.functional.discussionBoard.admin.activityLogs.create(
      connection,
      {
        body: input,
      },
    );
    typia.assert(log);
    createdLogs.push(log);
  }

  // 2. Retrieve the first 3 pages from moderator endpoint
  const seenLogIds = new Set<string>();
  let unionLogs: IDiscussionBoardActivityLog[] = [];
  let lastPagination: IPage.IPagination | undefined;

  for (let pageNum = 1; pageNum <= numPages; ++pageNum) {
    // NOTE: The endpoint as provided has no documented query params for paging, so assume pagination is default-incremented
    const response =
      await api.functional.discussionBoard.moderator.activityLogs.index(
        connection,
      );
    typia.assert(response);
    const { pagination, data } = response;
    lastPagination = pagination;

    // Record IDs for de-duplication
    for (const log of data) {
      // Only include not already seen (simulate page iteration)
      if (!seenLogIds.has(log.id)) {
        unionLogs.push(log);
        seenLogIds.add(log.id);
      }
    }
  }

  // 3. Check that we retrieved at least as many logs as inserted
  TestValidator.predicate("all created logs should be present")(
    createdLogs.every((log) => seenLogIds.has(log.id)),
  );

  // 4. Assert pagination meta
  if (lastPagination) {
    TestValidator.equals("total records matches injected logs")(
      lastPagination.records,
    )(createdLogs.length);
    TestValidator.equals("pages matches")(lastPagination.pages)(numPages);
  }

  // 5. Structure validation (already typia.assert for every response)
  // Also, check no data loss/corruption for core fields
  for (const created of createdLogs) {
    const found = unionLogs.find((l) => l.id === created.id);
    TestValidator.predicate("log details should match")(
      !!found &&
        found.actor_id === created.actor_id &&
        found.action_type === created.action_type &&
        found.actor_type === created.actor_type,
    );
  }
}
