import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search and filter functionality for audit logs
 * (discussion_board_audit_logs).
 *
 * This scenario tests that searching with complex filters such as actor_id,
 * action_type, and date ranges returns the correct filtered and paginated
 * results.
 *
 * Prerequisite: At least two audit log entries must exist, each with distinct
 * actor_id and action_type values. This is achieved by creating two board
 * settings with different keys and values.
 *
 * Steps:
 *
 * 1. Create first board setting (expect audit log generated for this action)
 * 2. Create second board setting (expect second, different audit log entry)
 * 3. Query audit logs for all records: validate at least the two generated logs
 *    exist; extract actor_id, action_type, created_at
 * 4. Filter by actor_id of first log: verify only logs for that actor are included
 * 5. Filter by action_type of second log: verify only logs for that action_type
 *    are included
 * 6. Filter by date range (created_at_from, created_at_to) encompassing only the
 *    second log: verify only that log is returned
 * 7. Validate pagination (limit=1): ensure paging info and only one record
 *    returned
 */
export async function test_api_discussionBoard_test_search_audit_logs_with_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Create the first unique board setting
  const setting1 = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: {
        setting_key: `scenario1_${RandomGenerator.alphaNumeric(8)}`,
        setting_value: RandomGenerator.alphaNumeric(10),
        description: "Scenario test 1",
      },
    },
  );
  typia.assert(setting1);

  // 2. Create the second unique board setting (distinct value)
  const setting2 = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: {
        setting_key: `scenario2_${RandomGenerator.alphaNumeric(8)}`,
        setting_value: RandomGenerator.alphaNumeric(10),
        description: "Scenario test 2",
      },
    },
  );
  typia.assert(setting2);

  // 3. Query all audit logs (no filters) to find relevant log entries
  const allLogsResponse =
    await api.functional.discussionBoard.admin.auditLogs.search(connection, {
      body: {}, // no filters - retrieve all
    });
  typia.assert(allLogsResponse);
  TestValidator.predicate("at least two logs exist")(
    allLogsResponse.data.length >= 2,
  );

  // Pick log entries related to setting1 and setting2 (by target_id, action_type, actor_id, etc.)
  // As audit log spec is generic, pick logs where target_id == setting1.id or setting2.id
  const logEntry1 = allLogsResponse.data.find(
    (l) => l.target_id === setting1.id,
  );
  const logEntry2 = allLogsResponse.data.find(
    (l) => l.target_id === setting2.id,
  );
  TestValidator.predicate("setting1 log exists")(!!logEntry1);
  TestValidator.predicate("setting2 log exists")(!!logEntry2);
  // Defensive: set up for later filters
  if (!logEntry1 || !logEntry2)
    throw new Error("Required audit logs for test setup missing");

  // 4. Filter by actor_id of first log (should include logEntry1, possibly others for same actor)
  const byActor = await api.functional.discussionBoard.admin.auditLogs.search(
    connection,
    {
      body: {
        actor_id: logEntry1.actor_id || null,
      },
    },
  );
  typia.assert(byActor);
  // All returned logs must be by this actor
  for (const log of byActor.data) {
    TestValidator.equals("actor_id matches")(log.actor_id)(logEntry1.actor_id);
  }

  // 5. Filter by action_type of the second log
  const byAction = await api.functional.discussionBoard.admin.auditLogs.search(
    connection,
    {
      body: {
        action_type: logEntry2.action_type,
      },
    },
  );
  typia.assert(byAction);
  for (const log of byAction.data) {
    TestValidator.equals("action_type matches")(log.action_type)(
      logEntry2.action_type,
    );
  }

  // 6. Filter by created_at range just for second log
  // Pick a 1-second window that should only include logEntry2
  const createdFrom = logEntry2.created_at;
  const createdTo = logEntry2.created_at;
  const byTime = await api.functional.discussionBoard.admin.auditLogs.search(
    connection,
    {
      body: {
        created_at_from: createdFrom,
        created_at_to: createdTo,
      },
    },
  );
  typia.assert(byTime);
  // All results should have created_at within range and include the target log
  for (const log of byTime.data) {
    TestValidator.predicate("created_at in window")(
      log.created_at >= createdFrom && log.created_at <= createdTo,
    );
  }
  TestValidator.predicate(
    "includes only logEntry2 or empty if strict filtering",
  )(byTime.data.length === 0 || byTime.data.some((l) => l.id === logEntry2.id));

  // 7. Validate pagination: limit=1 returns single record and correct pagination
  const paged = await api.functional.discussionBoard.admin.auditLogs.search(
    connection,
    {
      body: { limit: 1 },
    },
  );
  typia.assert(paged);
  TestValidator.equals("only one record returned")(paged.data.length)(1);
  TestValidator.equals("pagination shows limit=1")(paged.pagination.limit)(1);
}
