import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActionLog";
import type { IPageIDiscussionBoardActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActionLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Successful paginated and filtered action log search as an
 * admin.
 *
 * This test validates the end-to-end workflow for an authenticated admin
 * user retrieving paginated and filtered lists of action logs.
 *
 * It covers:
 *
 * 1. Admin registration and authentication using /auth/admin/join
 * 2. Multiple paginated search requests using PATCH
 *    /discussionBoard/admin/actionLogs
 * 3. Verification of pagination metadata and filter effectiveness
 * 4. Type assertions, filter compliance, token handling, and edge cases
 *
 * Steps:
 *
 * 1. Register an admin and ensure authentication
 * 2. Perform paginated fetch (page 1, limit 10) and validate pagination result
 * 3. Search by status/metadata (chosen from real data) and check that results
 *    match filters
 * 4. Exercise a search with a random status string (should return empty or
 *    matching results)
 * 5. Confirm connection.headers.Authorization is correctly set after admin
 *    join
 */
export async function test_api_admin_action_log_search_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an admin user
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminJoinResp: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: adminUserId,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminJoinResp);
  TestValidator.predicate(
    "Authorization token must be set in connection after admin join",
    typeof connection.headers?.Authorization === "string" &&
      connection.headers.Authorization.length > 0,
  );

  // 2a. Paginated fetch (page 1, limit 10)
  const searchParams1: IDiscussionBoardActionLog.IRequest = {
    page: 1,
    limit: 10,
  };
  const page1: IPageIDiscussionBoardActionLog =
    await api.functional.discussionBoard.admin.actionLogs.index(connection, {
      body: searchParams1,
    });
  typia.assert(page1);
  TestValidator.equals(
    "pagination current page matches input",
    page1.pagination.current,
    searchParams1.page,
  );
  TestValidator.equals(
    "pagination limit matches input",
    page1.pagination.limit,
    searchParams1.limit,
  );
  TestValidator.predicate(
    "data is always an array (possibly empty)",
    Array.isArray(page1.data),
  );

  // 2b. Search with status and metadata filters, based on existing results
  if (page1.data.length > 0) {
    const firstLog = page1.data[0];
    const statusToSearch = firstLog.status;
    const metadataToSearch = firstLog.metadata ?? undefined;
    const searchParams2: IDiscussionBoardActionLog.IRequest = {
      status: statusToSearch,
      page: 1,
      limit: 5,
      search: metadataToSearch
        ? metadataToSearch.substring(0, Math.min(10, metadataToSearch.length))
        : undefined,
    };
    const filteredPage =
      await api.functional.discussionBoard.admin.actionLogs.index(connection, {
        body: searchParams2,
      });
    typia.assert(filteredPage);
    // All returned results must match the status filter
    TestValidator.predicate(
      "all results match the filtered status",
      filteredPage.data.every((log) => log.status === statusToSearch),
    );
    TestValidator.equals(
      "pagination limit as requested for status filter",
      filteredPage.pagination.limit,
      searchParams2.limit,
    );
    // If we apply a search term, all metadata fields must include it (if defined)
    if (searchParams2.search !== undefined) {
      TestValidator.predicate(
        "all results' metadata include search term",
        filteredPage.data.every((log) =>
          (log.metadata ?? "").includes(searchParams2.search!),
        ),
      );
    }
  }

  // 2c. Search using a random status - likely negative path
  const randomStatus = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const searchParams3: IDiscussionBoardActionLog.IRequest = {
    status: randomStatus,
    page: 2,
    limit: 3,
  };
  const page2 = await api.functional.discussionBoard.admin.actionLogs.index(
    connection,
    { body: searchParams3 },
  );
  typia.assert(page2);
  TestValidator.equals(
    "random status pagination current page matches input",
    page2.pagination.current,
    searchParams3.page,
  );
  TestValidator.equals(
    "random status pagination limit matches input",
    page2.pagination.limit,
    searchParams3.limit,
  );
  TestValidator.predicate(
    "data should be an array (even if empty) after random status search",
    Array.isArray(page2.data),
  );
}
