import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";

/**
 * End-to-end: Admin creates a new data erasure request (success scenario).
 *
 * This test validates the creation of a data erasure (GDPR/CCPA-compliant)
 * request as a privileged admin. It ensures compliance workflows function
 * as expected, audit fields are populated, and referential integrity is
 * preserved.
 *
 * Steps:
 *
 * 1. Generate a unique, valid user ID to simulate an existing verified user
 *    (for association).
 * 2. Register this user as an admin (admin join), authenticating as privileged
 *    actor.
 * 3. Using the authorized admin token, submit a new data erasure request for
 *    that user.
 * 4. Validate creation: all required fields present, referential integrity,
 *    audit/traceability, and workflow status.
 */
export async function test_api_data_erasure_request_admin_create_success(
  connection: api.IConnection,
) {
  // 1. Prepare a unique, simulated discussion board user ID (pretend this is an existing, verified user for test)
  const test_user_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Register/join this user as an admin for privileged compliance operation
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: { user_id: test_user_id } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminAuth);
  // At this point, connection.headers.Authorization contains the admin JWT

  // 3. As admin, construct a new erasure request (simulate regulatory request for this user; minimal required fields)
  const reqBody = {
    discussion_board_user_id: test_user_id,
    request_type: "full_account", // simulate full account erasure request (other recognized types possible)
    justification: RandomGenerator.paragraph({ sentences: 4 }), // Non-empty justification for audit
    regulator_reference: null, // leave null (optional field)
  } satisfies IDiscussionBoardDataErasureRequest.ICreate;

  const erasureRequest: IDiscussionBoardDataErasureRequest =
    await api.functional.discussionBoard.admin.dataErasureRequests.create(
      connection,
      { body: reqBody },
    );
  typia.assert(erasureRequest);

  // 4. Validate all relevant fields for compliance, traceability, and correctness
  // a. Basic referential/audit integrity
  TestValidator.predicate(
    "erasure request has valid UUID",
    typeof erasureRequest.id === "string" && erasureRequest.id.length > 0,
  );
  TestValidator.equals(
    "user ID matches (referential integrity)",
    erasureRequest.discussion_board_user_id,
    test_user_id,
  );
  TestValidator.equals(
    "request_type is correct (business logic)",
    erasureRequest.request_type,
    reqBody.request_type,
  );

  // b. Non-empty justification retained in output
  TestValidator.predicate(
    "justification is present and non-empty",
    typeof erasureRequest.justification === "string" &&
      erasureRequest.justification.length > 0,
  );
  // c. Initially, status should be 'pending' for workflow
  TestValidator.equals(
    "status is pending after creation",
    erasureRequest.status,
    "pending",
  );
  // d. Audit/traceability info: ISO date fields non-empty
  TestValidator.predicate(
    "submitted_at is ISO 8601 date-time string",
    typeof erasureRequest.submitted_at === "string" &&
      erasureRequest.submitted_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time string",
    typeof erasureRequest.created_at === "string" &&
      erasureRequest.created_at.length > 0,
  );
  // e. processed_at, deleted_at, regulator_reference are null at creation
  TestValidator.equals(
    "processed_at is null on creation",
    erasureRequest.processed_at,
    null,
  );
  TestValidator.equals(
    "regulator_reference is null as submitted",
    erasureRequest.regulator_reference,
    reqBody.regulator_reference,
  );
  TestValidator.equals(
    "deleted_at is null at creation",
    erasureRequest.deleted_at,
    null,
  );
}
