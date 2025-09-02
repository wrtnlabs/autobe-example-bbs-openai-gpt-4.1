import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate retrieval of the admin tag list when no tags exist.
 *
 * This test covers the corner case where the discussion board begins with
 * no tags defined. It ensures that when an admin user queries for the tag
 * list, the system:
 *
 * 1. Returns a response with an empty data array (no tags).
 * 2. Provides a fully-formed pagination object, with record and page counts
 *    set to zero.
 * 3. Responds successfully (not error/null), confirming API resilience to
 *    empty sets.
 * 4. There is never a data-level error nor an inadvertent null; just a
 *    zero-length list with correct paging meta.
 *
 * Test Steps:
 *
 * 1. Register an admin using the admin join endpoint.
 * 2. With those admin credentials, send a PATCH request to
 *    /discussionBoard/admin/tags with defaults (no search, paging, or
 *    filter params).
 * 3. Assert that the returned data list is empty, and that pagination has
 *    (records: 0, pages: 0, current: 1, limit: default/expected value).
 * 4. Validate structural integrity (no error thrown, response type as
 *    expected).
 */
export async function test_api_admin_tag_index_empty_result(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Admin retrieves tags (expecting empty list)
  const output = await api.functional.discussionBoard.admin.tags.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(output);

  // 3. Assert response has proper structure for empty result
  TestValidator.equals("tag data array is empty", output.data, []);
  TestValidator.equals(
    "zero tags returned in pagination record count",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero total pages when no data",
    output.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 by default",
    output.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is a positive integer",
    typeof output.pagination.limit === "number" && output.pagination.limit > 0,
  );
}
