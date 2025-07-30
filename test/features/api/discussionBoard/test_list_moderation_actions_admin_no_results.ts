import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate empty moderation action list for admin view.
 *
 * Ensures that when there are no moderation actions present in the system, the
 * admin receives an empty result set, and the pagination metadata accurately
 * reflects zero available actions. This test also verifies that the API
 * response structure is well-formed and compliant with DTO.
 *
 * Steps:
 *
 * 1. As admin (default connection), call GET
 *    /discussionBoard/admin/moderationActions
 * 2. Type check response for shape and content contract
 * 3. Assert that the data array is empty
 * 4. Assert that pagination.records and pagination.pages are 0
 * 5. Assert that pagination.current (page number) and pagination.limit are
 *    positive integers
 */
export async function test_api_discussionBoard_admin_moderationActions_index_no_results(
  connection: api.IConnection,
) {
  // 1. Call moderation actions list as admin
  const output =
    await api.functional.discussionBoard.admin.moderationActions.index(
      connection,
    );
  typia.assert(output);

  // 2. The data array must be empty
  TestValidator.equals("empty moderation actions data")(output.data)([]);

  // 3. Pagination: both records and pages must be zero (total empty result)
  TestValidator.equals("pagination.records === 0")(output.pagination.records)(
    0,
  );
  TestValidator.equals("pagination.pages === 0")(output.pagination.pages)(0);

  // 4. Pagination: page and limit are positive integers (should always be present)
  TestValidator.predicate("pagination.current is positive")(
    typeof output.pagination.current === "number" &&
      output.pagination.current > 0,
  );
  TestValidator.predicate("pagination.limit is positive")(
    typeof output.pagination.limit === "number" && output.pagination.limit > 0,
  );
}
