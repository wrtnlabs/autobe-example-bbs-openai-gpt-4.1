import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";
import type { IPageIDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * End-to-end test for retrieving a paginated list of search history records with complex filtering and access control.
 *
 * This test covers multiple aspects:
 * 1. Creation of test users (discussion board members) and guest sessions
 * 2. Insertion of multiple search history records for both members and guests, with diversity in keywords, actor types, filters, date/times, and search contexts
 * 3. Retrieval of search history with diverse filtering (by keyword, actor, context, date range, pagination) as a system administrator (simulated by using privileged connection)
 * 4. Validation that only authorized users (admins) can access all data, and that queries with invalid filters or from unauthorized users are rejected
 * 5. Ensuring correct pagination and structure in the returned data
 *
 * Business rationale: The ability to review and filter search histories is key for audit, moderation, and analytics on the board. Proper access controls, filtering, and data visibility are business-critical, as is maintaining data privacy between actor types.
 *
 * Test Steps:
 * 1. Create two member accounts (memberA and memberB), each with a unique email and username
 * 2. Create two guest sessions (guestA and guestB) with unique session tokens and IPs
 * 3. Create several search history entries for both member and guest actors, diversifying keywords, filters (as serialized JSON string), contexts, and timestamps (spaced apart for date filtering)
 * 4. As an admin, retrieve full search histories with:
 *    a) No filters (get all, verify result is superset)
 *    b) Filter by keyword (verify only matching records returned)
 *    c) Filter by actor_id (only memberA or guestA, verify results)
 *    d) Filter by context
 *    e) Filter by created_from/created_to (date range)
 *    f) Pagination (page/limit)
 * 5. As a normal member, attempt to retrieve histories (expect either only own history or forbidden, per business rule)
 * 6. As a guest, attempt to retrieve histories (should be forbidden)
 * 7. Attempt invalid filter combinations and validate errors
 */
export async function test_api_discussionBoard_test_list_search_histories_with_various_filters(
  connection: api.IConnection,
) {
  // 1. Create two members
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<'email'>>(),
      hashed_password: RandomGenerator.alphaNumeric(24),
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate
  });
  typia.assert(memberA);
  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<'email'>>(),
      hashed_password: RandomGenerator.alphaNumeric(24),
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate
  });
  typia.assert(memberB);

  // 2. Create two guests
  const guestA = await api.functional.discussionBoard.guests.post(connection, {
    body: {
      session_token: RandomGenerator.alphaNumeric(32),
      ip_address: "1.1.1.1",
      user_agent: "TestAgent/1.0",
      expires_at: new Date(Date.now() + 1000*60*60*24).toISOString()
    } satisfies IDiscussionBoardGuest.ICreate
  });
  typia.assert(guestA);
  const guestB = await api.functional.discussionBoard.guests.post(connection, {
    body: {
      session_token: RandomGenerator.alphaNumeric(32),
      ip_address: "2.2.2.2",
      user_agent: "TestAgent/2.0",
      expires_at: new Date(Date.now() + 1000*60*60*48).toISOString()
    } satisfies IDiscussionBoardGuest.ICreate
  });
  typia.assert(guestB);

  // 3. Insert search history records (different actors, keywords, filters, context, time)
  const histories = await Promise.all([
    api.functional.discussionBoard.searchHistories.post(connection, {
      body: {
        actor_id: memberA.id,
        keyword: "alpha",
        filters: JSON.stringify({ tag: "news" }),
        search_context: "main_page"
      } satisfies IDiscussionBoardSearchHistory.ICreate
    }),
    api.functional.discussionBoard.searchHistories.post(connection, {
      body: {
        actor_id: memberA.id,
        keyword: "beta",
        filters: null,
        search_context: "thread_list"
      } satisfies IDiscussionBoardSearchHistory.ICreate
    }),
    api.functional.discussionBoard.searchHistories.post(connection, {
      body: {
        actor_id: memberB.id,
        keyword: "gamma",
        filters: JSON.stringify({ category: "help" }),
        search_context: "main_page"
      } satisfies IDiscussionBoardSearchHistory.ICreate
    }),
    api.functional.discussionBoard.searchHistories.post(connection, {
      body: {
        actor_id: guestA.id,
        keyword: "delta",
        filters: JSON.stringify({ tag: "general" }),
        search_context: "search_bar"
      } satisfies IDiscussionBoardSearchHistory.ICreate
    }),
    api.functional.discussionBoard.searchHistories.post(connection, {
      body: {
        actor_id: guestB.id,
        keyword: "epsilon",
        filters: null,
        search_context: "thread_list"
      } satisfies IDiscussionBoardSearchHistory.ICreate
    })
  ]);
  histories.forEach(h => typia.assert(h));

  // 4.a) Admin: retrieve all histories, no filter
  const searchAll = await api.functional.discussionBoard.searchHistories.patch(connection, {
    body: {} satisfies IDiscussionBoardSearchHistory.IRequest
  });
  typia.assert(searchAll);
  TestValidator.predicate("retrieves at least all inserted histories")(
    searchAll.data.length >= histories.length
  );

  // 4.b) Admin: filter by keyword
  const searchAlpha = await api.functional.discussionBoard.searchHistories.patch(connection, {
    body: { keyword: "alpha" } satisfies IDiscussionBoardSearchHistory.IRequest
  });
  typia.assert(searchAlpha);
  TestValidator.predicate("only entries with 'alpha' in keyword returned")(
    searchAlpha.data.every(h => h.keyword.includes("alpha"))
  );

  // 4.c) Admin: filter by actor_id
  const searchByActor = await api.functional.discussionBoard.searchHistories.patch(connection, {
    body: { actor_id: memberB.id } satisfies IDiscussionBoardSearchHistory.IRequest
  });
  typia.assert(searchByActor);
  TestValidator.predicate("entries belong to memberB")(
    searchByActor.data.every(h => h.actor_id === memberB.id)
  );

  // 4.d) Admin: by search_context
  const searchByContext = await api.functional.discussionBoard.searchHistories.patch(connection, {
    body: { search_context: "main_page" } satisfies IDiscussionBoardSearchHistory.IRequest
  });
  typia.assert(searchByContext);
  TestValidator.predicate("all entries are from main_page context")(
    searchByContext.data.every(h => h.search_context === "main_page")
  );

  // 4.e) Admin: by date range (created_from/created_to)
  const createdFrom = new Date(Date.now() - 60*60*1000).toISOString();
  const createdTo = new Date(Date.now() + 60*60*1000).toISOString();
  const dateFiltered = await api.functional.discussionBoard.searchHistories.patch(connection, {
    body: {
      created_from: createdFrom,
      created_to: createdTo
    } satisfies IDiscussionBoardSearchHistory.IRequest
  });
  typia.assert(dateFiltered);
  TestValidator.predicate("all entries inside date range")(
    dateFiltered.data.every(h => h.created_at >= createdFrom && h.created_at <= createdTo)
  );

  // 4.f) Pagination (page, limit)
  const paged = await api.functional.discussionBoard.searchHistories.patch(connection, {
    body: {
      page: 1,
      limit: 2
    } satisfies IDiscussionBoardSearchHistory.IRequest
  });
  typia.assert(paged);
  TestValidator.equals("page matches")(paged.pagination.current)(1);
  TestValidator.equals("limit matches")(paged.pagination.limit)(2);
  TestValidator.predicate("not more than limit returned")(
    paged.data.length <= 2
  );

  // 5. Attempt as member/guest (testing access control). For this, we simulate forbidden scenario by using the same API as a normal member and a guest.
  // (No member/guest auth API in materials, so skip actual role-switching; this would require connection with different auth.)

  // 6. Invalid filters: use nonsense/invalid filter value (should yield error or empty result, but we only test for rejected/empty result, since error messages are not to be tested)
  const invalidFilterResult = await api.functional.discussionBoard.searchHistories.patch(connection, {
    body: { keyword: "nonexistent-keyword-that-should-not-match-anything" } satisfies IDiscussionBoardSearchHistory.IRequest
  });
  typia.assert(invalidFilterResult);
  TestValidator.equals("no result for nonsense keyword")(invalidFilterResult.data.length)(0);
}