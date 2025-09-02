import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";
import type { IPageIDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataErasureRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for successful retrieval of paginated data erasure requests as
 * an authenticated admin.
 *
 * Steps:
 *
 * 1. Register an admin using the admin join endpoint (with a random, valid
 *    user_id)
 * 2. As the authenticated admin, call the PATCH
 *    /discussionBoard/admin/dataErasureRequests endpoint with a request
 *    body that uses various filters (user, status, type, submitted_at
 *    range, page, limit)
 * 3. Check that the results are paginated correctly (pagination object matches
 *    request/response contract)
 * 4. Inspect 'data' array to ensure erasure request summaries contain required
 *    fields (id, discussion_board_user_id, request_type, status,
 *    submitted_at, processed_at)
 * 5. Ensure only admin can access (covered by entering with admin auth
 *    context)
 * 6. Type assertions: typia.assert at all API response boundaries
 * 7. Logical test validator checks for pagination and at least one record, if
 *    present.
 */
export async function test_api_data_erasure_requests_admin_index_success(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // Step 2: Search/filter for erasure requests as admin
  const requestBody: IDiscussionBoardDataErasureRequest.IRequest = {
    // Use a mix of random and default filter params
    discussion_board_user_id: typia.random<string & tags.Format<"uuid">>(),
    status: RandomGenerator.pick([
      "pending",
      "processing",
      "completed",
      "rejected",
    ] as const),
    request_type: RandomGenerator.pick([
      "full_account",
      "post_only",
      "comment_only",
      "custom_type",
    ] as const),
    submitted_at_from: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    submitted_at_to: new Date().toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardDataErasureRequest.IRequest;

  const response =
    await api.functional.discussionBoard.admin.dataErasureRequests.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);

  // Step 3: Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is as requested",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages field",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );

  // Step 4: Validate summary entries
  if (response.data.length > 0) {
    for (const entry of response.data) {
      typia.assert<IDiscussionBoardDataErasureRequest.ISummary>(entry);
      TestValidator.predicate(
        "each summary has id",
        typeof entry.id === "string" && entry.id.length > 0,
      );
      TestValidator.predicate(
        "each summary has user id",
        typeof entry.discussion_board_user_id === "string" &&
          entry.discussion_board_user_id.length > 0,
      );
      TestValidator.predicate(
        "each summary has request type",
        typeof entry.request_type === "string",
      );
      TestValidator.predicate(
        "each summary has status",
        typeof entry.status === "string",
      );
      TestValidator.predicate(
        "each summary has submitted_at",
        typeof entry.submitted_at === "string",
      );
      // processed_at can be null or string
      TestValidator.predicate(
        "processed_at is string or null or undefined",
        entry.processed_at === null ||
          entry.processed_at === undefined ||
          typeof entry.processed_at === "string",
      );
    }
  } else {
    TestValidator.equals("empty result is allowed", response.data.length, 0);
  }
}
