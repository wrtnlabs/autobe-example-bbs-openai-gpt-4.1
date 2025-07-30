import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validate admin guest session list retrieval when no guests exist.
 *
 * This test confirms the system's correct handling of the case where the guest
 * session database is empty. It simulates an admin user requesting the full
 * guest session list, expecting the result to be a valid paginated response
 * with an empty data array, and no errors. No setup is required since the
 * database is expected to be empty.
 *
 * Steps:
 *
 * 1. Call the admin guest session list endpoint with no prior guest records in the
 *    database.
 * 2. Assert that the returned data array is empty and the pagination metadata is
 *    valid.
 * 3. Validate that no error is thrown and the type matches expectations.
 */
export async function test_api_discussionBoard_test_retrieve_guest_list_when_empty(
  connection: api.IConnection,
) {
  // 1. Request the guest session list (should be empty)
  const response =
    await api.functional.discussionBoard.admin.guests.index(connection);
  typia.assert(response);

  // 2. Assert that the data array is empty
  TestValidator.equals("No guest records exist")(response.data.length)(0);

  // 3. Optionally, check pagination structure
  TestValidator.equals("Pagination: total records is 0")(
    response.pagination.records,
  )(0);
  TestValidator.equals("Pagination: total pages is 0")(
    response.pagination.pages,
  )(0);
}
