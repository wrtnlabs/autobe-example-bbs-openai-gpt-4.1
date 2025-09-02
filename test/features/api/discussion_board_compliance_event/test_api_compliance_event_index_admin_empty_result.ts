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
 * Test empty compliance event listing for a new admin with no events.
 *
 * Verifies that a newly created admin, when querying the compliance events
 * endpoint before any events exist, receives a successful response
 * containing an empty array and correct pagination metadata. This validates
 * proper empty state handling, authentication requirements, and pagination
 * contract.
 *
 * Steps:
 *
 * 1. Register a discussion board admin.
 * 2. Query the compliance events index endpoint as this admin before any
 *    events are created.
 * 3. Assert no errors, response data array is empty, and pagination metadata
 *    is correct for empty state.
 */
export async function test_api_compliance_event_index_admin_empty_result(
  connection: api.IConnection,
) {
  // 1. Register a discussion board admin (authenticate session)
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Query compliance events as authenticated admin (before any exist)
  const result =
    await api.functional.discussionBoard.admin.complianceEvents.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardComplianceEvent.IRequest,
      },
    );
  typia.assert(result);

  // 3. Validate response structure and values for empty state
  TestValidator.equals(
    "compliance events list empty for fresh admin",
    result.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records zero for no data",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  // Accept pages being 0 or 1 depending on backend empty-set policy
  TestValidator.predicate(
    "pagination pages is 0 or 1 for empty compliance event list",
    result.pagination.pages === 0 || result.pagination.pages === 1,
  );
}
