import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * Validate successful update of an audit log entry by admin.
 *
 * This test covers the full workflow of creating an audit log, updating it, and
 * verifying the changes and history for audit integrity.
 *
 * Steps:
 *
 * 1. Create a new audit log entry (using the admin endpoint).
 * 2. Update key fields of the entry by its id (e.g., action_detail, target_id).
 * 3. Assert updated fields reflect new values; unchanged fields remain consistent.
 * 4. Confirm system-managed fields (id, created_at) are not altered except as
 *    allowed.
 * 5. Ensure all changes are returned and traceable for audit compliance.
 */
export async function test_api_discussionBoard_admin_auditLogs_test_update_audit_log_event_by_id_successful_update(
  connection: api.IConnection,
) {
  // 1. Create a new audit log entry
  const createInput: IDiscussionBoardAuditLog.ICreate = {
    actor_id: typia.random<string & tags.Format<"uuid">>(),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "assign_moderator",
    action_detail: "Moderator assigned to category 1234 for policy compliance.",
  };
  const created: IDiscussionBoardAuditLog =
    await api.functional.discussionBoard.admin.auditLogs.create(connection, {
      body: createInput,
    });
  typia.assert(created);

  // 2. Update audit log fields by id
  const updateInput: IDiscussionBoardAuditLog.IUpdate = {
    action_detail: "Moderator was updated to category 9999. See details.",
    target_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const updated: IDiscussionBoardAuditLog =
    await api.functional.discussionBoard.admin.auditLogs.update(connection, {
      auditLogId: created.id,
      body: updateInput,
    });
  typia.assert(updated);

  // 3. Assert updated fields reflect new values
  TestValidator.equals("updated action_detail")(updated.action_detail)(
    updateInput.action_detail,
  );
  TestValidator.equals("updated target_id")(updated.target_id)(
    updateInput.target_id,
  );

  // 4. Assert unchanged fields remain consistent
  TestValidator.equals("id unchanged")(updated.id)(created.id);
  TestValidator.equals("action_type unchanged")(updated.action_type)(
    created.action_type,
  );
  TestValidator.equals("actor_id unchanged")(updated.actor_id)(
    created.actor_id,
  );

  // 5. Confirm system-managed fields (created_at) remain correct (not reversed/null)
  TestValidator.predicate("created_at retained and valid")(
    typeof updated.created_at === "string" && updated.created_at.length > 0,
  );
}
