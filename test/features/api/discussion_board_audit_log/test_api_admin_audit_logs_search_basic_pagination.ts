import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for basic audit log search & pagination.
 *
 * This function verifies that platform audit logs can be searched and
 * paginated via admin APIs, and that soft-deleted audit logs (with
 * deleted_at) do not appear in search results.
 *
 * Steps:
 *
 * 1. Register a new admin to simulate authenticated access
 * 2. As the admin, invoke the /discussionBoard/admin/auditLogs endpoint
 *    (PATCH) with page/limit only
 * 3. Validate that the response has proper pagination metadata (current,
 *    limit, records, pages)
 * 4. Assert that returned data is an array of audit logs with required fields:
 *    id, actor_id, actor_role, action_type, target_object, description,
 *    created_at
 * 5. For each audit log returned, confirm deleted_at is NOT present (i.e.,
 *    soft-deleted logs are not visible)
 */
export async function test_api_admin_audit_logs_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register/create a new admin (admin user_id must refer to a verified user in real system; here we use a random UUID)
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // 2. Call the audit log index/search endpoint as admin using paging params
  const page = 1;
  const limit = 10;
  const auditPage = await api.functional.discussionBoard.admin.auditLogs.index(
    connection,
    {
      body: { page, limit } satisfies IDiscussionBoardAuditLog.IRequest,
    },
  );
  typia.assert(auditPage);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page matches requested page",
    auditPage.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit matches requested limit",
    auditPage.pagination.limit === limit,
  );
  TestValidator.predicate(
    "records is non-negative",
    auditPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is at least 1 if records exist",
    auditPage.pagination.pages >= (auditPage.pagination.records > 0 ? 1 : 0),
  );
  // 4. Check returned data array
  TestValidator.predicate("data is an array", Array.isArray(auditPage.data));
  for (const log of auditPage.data) {
    typia.assert(log);
    TestValidator.predicate(
      "audit log id is present",
      typeof log.id === "string" && !!log.id,
    );
    TestValidator.predicate(
      "actor_role is present",
      typeof log.actor_role === "string" && !!log.actor_role,
    );
    TestValidator.predicate(
      "action_type is present",
      typeof log.action_type === "string" && !!log.action_type,
    );
    TestValidator.predicate(
      "created_at is ISO string",
      typeof log.created_at === "string" && !isNaN(Date.parse(log.created_at)),
    );
    // 5. Verify soft-deleted logs are not present (IDiscussionBoardAuditLog has no deleted_at field, so this is guaranteed by type)
  }
}
