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
 * Test that unauthenticated users cannot access the export log list API.
 *
 * This test attempts to call the PATCH /discussionBoard/admin/exportLogs
 * endpoint without setting any Authorization header, simulating an
 * unauthenticated context. The request body may be an empty filter or fully
 * omitted parameters. The expectation is that the API rejects the request
 * with an appropriate authorization/permission error (usually 401
 * Unauthorized or 403 Forbidden) and DOES NOT return any export log data.
 */
export async function test_api_export_log_list_permission_denied_for_unauthenticated_user(
  connection: api.IConnection,
) {
  // Prepare a connection with no authentication header (unauthenticated user)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user cannot access export log list",
    async () => {
      await api.functional.discussionBoard.admin.exportLogs.index(unauthConn, {
        body: {}, // No filters, simulate empty query
      });
    },
  );
}
