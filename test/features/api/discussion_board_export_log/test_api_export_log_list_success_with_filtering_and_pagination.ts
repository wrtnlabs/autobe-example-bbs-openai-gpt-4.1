import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";
import type { IPageIDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardExportLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate export log list retrieval with filtering and pagination for
 * compliance audit.
 *
 * This test ensures the export log index endpoint correctly processes
 * filtering and pagination criteria, returning only matching results and
 * respecting business search constraints for admin compliance tasks.
 *
 * Steps:
 *
 * 1. Register and login as a new admin (POST /auth/admin/join) to acquire
 *    necessary authorization for log management features.
 * 2. Create multiple export log entries (POST
 *    /discussionBoard/admin/exportLogs) with diverse combinations of
 *    target_type, status, and file_type (e.g., 'user', 'regulator', CSV,
 *    PDF, JSON, status: available/expired/failed).
 * 3. For each filter scenario, call PATCH /discussionBoard/admin/exportLogs
 *    (index) with advanced filters:
 *
 *    - By specific target_type (e.g., 'user', 'regulator')
 *    - By status (e.g., 'available', 'expired')
 *    - By file_type (e.g., 'application/pdf', 'application/csv')
 *    - By requester (requested_by_user_id) if present
 *    - Date range on exported_at if possible
 *    - Combine filters to test compound logic
 *    - Paginate (page/limit) to test result slicing
 * 4. Assert via TestValidator.equals/ predicate that:
 *
 *    - All returned results match the filters/pagination supplied
 *    - The number of returned records <= limit, and current/total pages are
 *         correct
 *    - No results outside the filter set are included
 *    - Results do NOT contain any sensitive user PII other than user IDs
 */
export async function test_api_export_log_list_success_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin and acquire token
  const user_id = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  const adminId = adminAuth.admin.id;

  // 2. Create multiple export logs with varying properties
  const logData: IDiscussionBoardExportLog.ICreate[] = [
    {
      target_type: "user",
      file_uri: `/exports/user_audit_${RandomGenerator.alphaNumeric(8)}.csv`,
      file_type: "application/csv",
      exported_at: new Date(Date.now() - 8 * 86400000).toISOString(), // 8 days ago
      status: "available",
      requested_by_user_id: user_id,
    },
    {
      target_type: "regulator",
      file_uri: `/exports/regulator_${RandomGenerator.alphaNumeric(8)}.pdf`,
      file_type: "application/pdf",
      exported_at: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
      status: "expired",
      requested_by_user_id: null,
    },
    {
      target_type: "legal",
      file_uri: `/exports/legal_${RandomGenerator.alphaNumeric(8)}.json`,
      file_type: "application/json",
      exported_at: new Date(Date.now() - 1 * 86400000).toISOString(), // 1 day ago
      status: "failed",
      requested_by_user_id: user_id,
    },
    {
      target_type: "user",
      file_uri: `/exports/user_audit_${RandomGenerator.alphaNumeric(8)}.csv`,
      file_type: "application/csv",
      exported_at: new Date(Date.now() - 6 * 86400000).toISOString(), // 6 days ago
      status: "expired",
      requested_by_user_id: user_id,
    },
    {
      target_type: "regulator",
      file_uri: `/exports/regulator_${RandomGenerator.alphaNumeric(8)}.csv`,
      file_type: "application/csv",
      exported_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
      status: "available",
      requested_by_user_id: null,
    },
  ];
  const createdLogs: IDiscussionBoardExportLog[] = [];
  for (const data of logData) {
    const log = await api.functional.discussionBoard.admin.exportLogs.create(
      connection,
      {
        body: data satisfies IDiscussionBoardExportLog.ICreate,
      },
    );
    typia.assert(log);
    createdLogs.push(log);
  }

  // 3. Filtering scenarios
  // a) By target_type: 'user'
  let filterReq: IDiscussionBoardExportLog.IRequest = { target_type: "user" };
  let page = await api.functional.discussionBoard.admin.exportLogs.index(
    connection,
    {
      body: filterReq,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "all results should have target_type 'user'",
    page.data.every((d) => d.target_type === "user"),
  );

  // b) By file_type: 'application/csv'
  filterReq = { file_type: "application/csv" };
  page = await api.functional.discussionBoard.admin.exportLogs.index(
    connection,
    {
      body: filterReq,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "all results should have file_type 'application/csv'",
    page.data.every((d) => d.file_type === "application/csv"),
  );

  // c) By status: 'expired'
  filterReq = { status: "expired" };
  page = await api.functional.discussionBoard.admin.exportLogs.index(
    connection,
    {
      body: filterReq,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "all results should have status 'expired'",
    page.data.every((d) => d.status === "expired"),
  );

  // d) By multiple filters: target_type 'user' && status 'expired'
  filterReq = { target_type: "user", status: "expired" };
  page = await api.functional.discussionBoard.admin.exportLogs.index(
    connection,
    {
      body: filterReq,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "all results should have target_type 'user' and status 'expired'",
    page.data.every((d) => d.target_type === "user" && d.status === "expired"),
  );

  // e) By requested_by_user_id
  filterReq = { requested_by_user_id: user_id };
  page = await api.functional.discussionBoard.admin.exportLogs.index(
    connection,
    {
      body: filterReq,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "all results should have requested_by_user_id == user_id or null",
    page.data.every((d) => d.requested_by_user_id === user_id),
  );

  // f) By exported_at_from and exported_at_to (date range)
  const from = new Date(Date.now() - 7 * 86400000).toISOString(); // 7 days ago
  const to = new Date().toISOString();
  filterReq = { exported_at_from: from, exported_at_to: to };
  page = await api.functional.discussionBoard.admin.exportLogs.index(
    connection,
    {
      body: filterReq,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "all results have exported_at >= from and <= to",
    page.data.every((d) => d.exported_at >= from && d.exported_at <= to),
  );

  // g) Paging: limit to 2 per page, page 1
  filterReq = { page: 1, limit: 2 };
  page = await api.functional.discussionBoard.admin.exportLogs.index(
    connection,
    {
      body: filterReq,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "paging/limit enforced: results length <= limit",
    page.data.length <= 2,
  );
  TestValidator.equals(
    "current page in pagination should be 1",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pages > 1 for multiple logs",
    page.pagination.pages > 1,
  );

  // 4. Check for absence of sensitive PII (should only have user_id fields)
  const forbiddenFields = ["email", "name", "phone", "address"];
  TestValidator.predicate(
    "no sensitive PII fields exposed in page.data",
    page.data.every(
      (item) =>
        !forbiddenFields.some((field) =>
          Object.prototype.hasOwnProperty.call(item, field),
        ),
    ),
  );
}
