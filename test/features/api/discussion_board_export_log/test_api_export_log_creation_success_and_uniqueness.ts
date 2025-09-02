import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";

/**
 * Test creation of discussion board export logs by admin with uniqueness
 * enforcement.
 *
 * 1. Register a new admin via /auth/admin/join (using a random user_id for
 *    test isolation).
 * 2. Use the returned token in connection.headers for admin authentication
 *    context.
 * 3. Prepare IDiscussionBoardExportLog.ICreate payload with a unique file_uri,
 *    file_type, exported_at (ISO8601), status, and (optionally)
 *    requested_by_user_id.
 * 4. Call POST /discussionBoard/admin/exportLogs with the payload and assert
 *    output typia.assert and that critical fields match input (file_uri,
 *    target_type, file_type, status, exported_at).
 * 5. Attempt to create a second export log record with identical file_uri and
 *    expect an error (uniqueness constraint violation). Assert error occurs
 *    using TestValidator.error().
 */
export async function test_api_export_log_creation_success_and_uniqueness(
  connection: api.IConnection,
) {
  // 1. Register a new admin for test isolation
  const testAdminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: { user_id: testAdminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  const adminId = adminAuth.admin.id;

  // 2. Prepare export log creation payload with unique file_uri
  const now = new Date();
  const exportPayload = {
    target_type: "user_privacy_audit",
    file_uri: `/exports/${typia.random<string & tags.Format<"uuid">>()}.json`,
    file_type: "application/json",
    exported_at: now.toISOString(),
    status: "available",
    requested_by_user_id: testAdminUserId,
  } satisfies IDiscussionBoardExportLog.ICreate;

  // 3. Successfully create export log
  const createdLog =
    await api.functional.discussionBoard.admin.exportLogs.create(connection, {
      body: exportPayload,
    });
  typia.assert(createdLog);
  TestValidator.equals(
    "file_uri should match input",
    createdLog.file_uri,
    exportPayload.file_uri,
  );
  TestValidator.equals(
    "target_type should match input",
    createdLog.target_type,
    exportPayload.target_type,
  );
  TestValidator.equals(
    "file_type should match input",
    createdLog.file_type,
    exportPayload.file_type,
  );
  TestValidator.equals(
    "status should match input",
    createdLog.status,
    exportPayload.status,
  );
  TestValidator.equals(
    "exported_at should match input",
    createdLog.exported_at,
    exportPayload.exported_at,
  );
  TestValidator.equals(
    "requested_by_user_id should match input",
    createdLog.requested_by_user_id,
    testAdminUserId,
  );

  // 4. Attempt to create duplicate export log (same file_uri) - should fail
  await TestValidator.error(
    "duplicate file_uri must trigger uniqueness error",
    async () => {
      await api.functional.discussionBoard.admin.exportLogs.create(connection, {
        body: { ...exportPayload },
      });
    },
  );
}
