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
 * Test successful retrieval of a compliance event's details by an
 * authenticated admin.
 *
 * Steps:
 *
 * 1. Register and login as an admin (establishes authentication context)
 * 2. List compliance events to ensure data is present and obtain a
 *    complianceEventId
 * 3. Retrieve details for a specific compliance event and validate its
 *    structure/fields
 *
 * This validates audit-level read access and field visibility for properly
 * authorized admin roles.
 */
export async function test_api_compliance_event_detail_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate an admin
  const userId: string = typia.random<string & tags.Format<"uuid">>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: userId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // Step 2: List compliance events to obtain at least one complianceEventId
  const listResponse =
    await api.functional.discussionBoard.admin.complianceEvents.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(listResponse);
  TestValidator.predicate(
    "compliance event list contains at least one event",
    listResponse.data.length > 0,
  );
  // Optionally validate pagination metadata structure
  TestValidator.predicate(
    "pagination structure validity",
    typeof listResponse.pagination.current === "number" &&
      typeof listResponse.pagination.limit === "number" &&
      typeof listResponse.pagination.records === "number" &&
      typeof listResponse.pagination.pages === "number",
  );

  // Step 3: Retrieve details of the first compliance event
  const complianceEventId = listResponse.data[0].id;
  const detail = await api.functional.discussionBoard.admin.complianceEvents.at(
    connection,
    {
      complianceEventId,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "compliance event id matches",
    detail.id,
    complianceEventId,
  );
  TestValidator.predicate(
    "event_type field is present and non-empty string",
    typeof detail.event_type === "string" && detail.event_type.length > 0,
  );
  TestValidator.predicate(
    "event_status field is present and non-empty string",
    typeof detail.event_status === "string" && detail.event_status.length > 0,
  );
  TestValidator.predicate(
    "detected_at is valid ISO date-time",
    typeof detail.detected_at === "string" &&
      Date.parse(detail.detected_at) > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    typeof detail.created_at === "string" && Date.parse(detail.created_at) > 0,
  );
  // Optional fields validation
  if (detail.resolved_at !== null && detail.resolved_at !== undefined)
    TestValidator.predicate(
      "resolved_at is valid ISO date-time if present",
      typeof detail.resolved_at === "string" &&
        Date.parse(detail.resolved_at) > 0,
    );
  if (
    detail.regulatory_ticket !== null &&
    detail.regulatory_ticket !== undefined
  )
    TestValidator.predicate(
      "regulatory_ticket is non-empty string if present",
      typeof detail.regulatory_ticket === "string" &&
        detail.regulatory_ticket.length > 0,
    );
  if (detail.assigned_staff !== null && detail.assigned_staff !== undefined)
    TestValidator.predicate(
      "assigned_staff is non-empty string if present",
      typeof detail.assigned_staff === "string" &&
        detail.assigned_staff.length > 0,
    );
}
