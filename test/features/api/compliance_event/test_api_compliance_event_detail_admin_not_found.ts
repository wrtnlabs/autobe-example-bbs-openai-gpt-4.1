import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComplianceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComplianceEvent";

/**
 * E2E test validating error handling for compliance event detail access
 * with a non-existent ID by an admin.
 *
 * This test ensures the API does not expose compliance event details for
 * events that do not exist, have been deleted, or where the given UUID is
 * not present in the system. It is crucial to ensure negative access tests
 * for sensitive audit resources, restricting enumeration or leakage through
 * random-complianceEventId guesses.
 *
 * Steps:
 *
 * 1. Register a new admin user via /auth/admin/join to ensure a valid admin
 *    session/token is available.
 * 2. Attempt to access GET
 *    /discussionBoard/admin/complianceEvents/{complianceEventId} with a
 *    random UUID that has not been created.
 * 3. Confirm that the API responds with a 404 not found or domain-compliant
 *    error (using TestValidator.error).
 */
export async function test_api_compliance_event_detail_admin_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin user (dependency - required for authorization)
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoinResult);

  // 2. Generate a random UUID that is presumed not in compliance events table
  const nonexistentComplianceEventId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Try to get the compliance event details and expect not found error
  await TestValidator.error(
    "admin cannot access nonexistent compliance event",
    async () => {
      await api.functional.discussionBoard.admin.complianceEvents.at(
        connection,
        {
          complianceEventId: nonexistentComplianceEventId,
        },
      );
    },
  );
}
