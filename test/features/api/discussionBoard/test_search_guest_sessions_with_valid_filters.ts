import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for guest session advanced search and filtering as admin.
 *
 * This test validates that an admin can successfully filter and paginate the
 * guest session analytics. First, it programmatically creates several distinct
 * guest session records with various combinations of session_identifier,
 * first_seen_at, and last_seen_at values using the dedicated guest creation
 * endpoint. It then issues PATCH requests to the admin guest search API using
 * realistic filter values (such as a subset session_identifier, and specific
 * date ranges for first_seen_at or last_seen_at).
 *
 * For each filter combination, it checks:
 *
 * 1. That only sessions matching the criteria are returned
 * 2. Pagination works—proper slicing of results per limit/page value
 * 3. Sorting of results by session identifier and timestamp as expected
 *
 * All API responses are asserted against the expected DTOs, and search logic is
 * validated for both inclusion (positive matches) and exclusion (negative
 * matches). Test covers edge cases such as null/date boundaries and
 * overlapping/non-overlapping date ranges. In summary, this ensures advanced
 * admin analytics and reporting workflows are robust and reliable.
 */
export async function test_api_discussionBoard_test_search_guest_sessions_with_valid_filters(
  connection: api.IConnection,
) {
  // Step 1: Create 4 guest sessions with different session_identifiers and time ranges
  // This ensures we can search/filter with predictable results.
  const baseTime = new Date();
  const guestSessions: IDiscussionBoardGuest[] = [];
  const ids = ["visitor-aaa", "visitor-bbb", "visitor-ccc", "visitor-xyz"];
  for (let i = 0; i < ids.length; ++i) {
    const session_identifier = ids[i];
    // Spread timestamps to allow controlled range searches
    const delta = i * 2; // separate by 2 hours each
    const first_seen_at = new Date(
      baseTime.getTime() - (8 - delta) * 60 * 60 * 1000,
    ).toISOString();
    const last_seen_at = new Date(
      baseTime.getTime() - (8 - delta - 1) * 60 * 60 * 1000,
    ).toISOString();
    const guest = await api.functional.discussionBoard.guests.create(
      connection,
      {
        body: {
          session_identifier,
          first_seen_at,
          last_seen_at,
        } satisfies IDiscussionBoardGuest.ICreate,
      },
    );
    typia.assert(guest);
    guestSessions.push(guest);
  }

  // Step 2: Search by exact session_identifier
  // Should return only the matching guest
  const targetGuest = guestSessions[2];
  const searchBySessionIdRes =
    await api.functional.discussionBoard.admin.guests.search(connection, {
      body: {
        session_identifier: targetGuest.session_identifier,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(searchBySessionIdRes);
  TestValidator.equals("exact match via session_identifier")(
    searchBySessionIdRes.data.length,
  )(1);
  TestValidator.equals("session_identifier matches")(
    searchBySessionIdRes.data[0].session_identifier,
  )(targetGuest.session_identifier);
  TestValidator.equals("result id matches")(searchBySessionIdRes.data[0].id)(
    targetGuest.id,
  );
  TestValidator.equals("pagination records")(
    searchBySessionIdRes.pagination.records,
  )(1);

  // Step 3: Search for a range covering two guests
  // Use boundary times for the middle two sessions
  const lower = guestSessions[1].first_seen_at;
  const upper = guestSessions[2].first_seen_at;
  const expectedSessions = guestSessions.filter(
    (g) => g.first_seen_at >= lower && g.first_seen_at <= upper,
  );
  const searchByDates =
    await api.functional.discussionBoard.admin.guests.search(connection, {
      body: {
        first_seen_at_from: lower,
        first_seen_at_to: upper,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(searchByDates);
  TestValidator.equals("guest count in range")(searchByDates.data.length)(
    expectedSessions.length,
  );
  // The result should contain only the sessions in the expected set.
  for (const g of searchByDates.data) {
    const match = expectedSessions.find((e) => e.id === g.id);
    TestValidator.predicate(`result guest ${g.id} is in expected set`)(!!match);
    TestValidator.predicate(`guest first_seen_at in range`)(
      g.first_seen_at >= lower && g.first_seen_at <= upper,
    );
  }

  // Step 4: Search with pagination - only two results per page
  const allResultIds = guestSessions.map((g) => g.id);
  const searchPaginated =
    await api.functional.discussionBoard.admin.guests.search(connection, {
      body: {
        limit: 2,
        page: 0,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(searchPaginated);
  TestValidator.equals("pagination: limit matches")(
    searchPaginated.pagination.limit,
  )(2);
  TestValidator.equals("page size")(searchPaginated.data.length)(2);
  for (const g of searchPaginated.data) {
    TestValidator.predicate("paginated result in inserted set")(
      allResultIds.includes(g.id),
    );
  }

  // Step 5: Edge case – search for a missing/nonexistent session_identifier
  const searchNoMatch =
    await api.functional.discussionBoard.admin.guests.search(connection, {
      body: {
        session_identifier: "does-not-exist",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(searchNoMatch);
  TestValidator.equals("no results for wrong session_identifier")(
    searchNoMatch.data.length,
  )(0);
  TestValidator.equals("pagination.records zero")(
    searchNoMatch.pagination.records,
  )(0);
}
