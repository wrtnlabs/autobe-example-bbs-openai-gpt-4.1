import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComplianceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComplianceEvent";
import type { IPageIDiscussionBoardComplianceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComplianceEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Admin can retrieve a paginated list of compliance events for audit
 * purposes. This test ensures only an authenticated admin can search
 * compliance events and verifies pagination/field consistency per business
 * requirements.
 *
 * Workflow:
 *
 * 1. Admin registration (join) to obtain auth context
 * 2. Use PATCH /discussionBoard/admin/complianceEvents to retrieve events
 * 3. Verify output structure, pagination fields, and compliance event field
 *    validity
 */
export async function test_api_compliance_event_index_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Register an admin to obtain authentication context
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Admin retrieves paginated compliance events with typical filter/pagination
  const req: IDiscussionBoardComplianceEvent.IRequest = {
    page: 1,
    limit: 10,
  };

  const result =
    await api.functional.discussionBoard.admin.complianceEvents.index(
      connection,
      {
        body: req,
      },
    );
  typia.assert(result);

  // Step 3: Verify pagination fields and data
  const pag = result.pagination;
  TestValidator.predicate("pagination current page >= 1", pag.current >= 1);
  TestValidator.predicate("pagination limit >= 1", pag.limit >= 1);
  TestValidator.predicate("pagination records >= 0", pag.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pag.pages >= 0);

  // Step 4: Validate each compliance event returned for field format and redactions
  for (const event of result.data) {
    typia.assert<IDiscussionBoardComplianceEvent>(event);
    TestValidator.predicate(
      "event id is a uuid",
      typeof event.id === "string" && event.id.length > 0,
    );
    TestValidator.predicate(
      "event_type is string",
      typeof event.event_type === "string",
    );
    TestValidator.predicate(
      "event_status is string",
      typeof event.event_status === "string",
    );
    TestValidator.predicate(
      "detected_at is ISO string",
      typeof event.detected_at === "string",
    );
    TestValidator.predicate(
      "created_at is ISO string",
      typeof event.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at is ISO string",
      typeof event.updated_at === "string",
    );
    // Redaction fields: deleted_at, resolved_at may be null or ISO string if present
    if (
      "deleted_at" in event &&
      event.deleted_at !== null &&
      event.deleted_at !== undefined
    )
      TestValidator.predicate(
        "deleted_at is ISO string",
        typeof event.deleted_at === "string",
      );
    if (
      "resolved_at" in event &&
      event.resolved_at !== null &&
      event.resolved_at !== undefined
    )
      TestValidator.predicate(
        "resolved_at is ISO string",
        typeof event.resolved_at === "string",
      );
  }
}
