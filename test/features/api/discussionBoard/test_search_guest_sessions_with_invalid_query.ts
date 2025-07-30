import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error handling for administrator guest session search with invalid
 * parameters
 *
 * Ensures that the admin guest analytics search endpoint on the discussion
 * board strictly validates filter and paging parameters. Any out-of-range,
 * incorrectly typed, or malformed values should result in a validation error.
 * This protection prevents faulty analytics queries, mis-reporting, and handles
 * developer/operator mistakes gracefully.
 *
 * Steps:
 *
 * 1. Try searching with a negative page number (violates range/type)
 * 2. Try searching with a non-integer page (wrong type)
 * 3. Attempt using an invalid date format for a filter
 * 4. Try a 'limit' far above normal/maximal value
 * 5. Assert that each such request is rejected with a validation error and no
 *    results are returned
 */
export async function test_api_discussionBoard_test_search_guest_sessions_with_invalid_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Negative page number (should fail)
  await TestValidator.error("negative page number should fail")(() =>
    api.functional.discussionBoard.admin.guests.search(connection, {
      body: { page: -10 },
    }),
  );

  // 2. Non-integer page (should fail type constraints)
  await TestValidator.error("string as page index should fail")(() =>
    api.functional.discussionBoard.admin.guests.search(connection, {
      body: { page: "1" as any },
    }),
  );

  // 3. Malformed date format for filter (should fail)
  await TestValidator.error("invalid date-time format for first_seen_at_from")(
    () =>
      api.functional.discussionBoard.admin.guests.search(connection, {
        body: { first_seen_at_from: "April 35th, 2020 25:61:00" as any },
      }),
  );

  // 4. Limit parameter far above expected maximum (should fail)
  await TestValidator.error(
    "limit parameter exceeding logical max should fail",
  )(() =>
    api.functional.discussionBoard.admin.guests.search(connection, {
      body: { limit: 1000000 },
    }),
  );
}
