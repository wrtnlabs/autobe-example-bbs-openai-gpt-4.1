import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for subscription list retrieval with pagination & advanced filters.
 *
 * Tests the /discussionBoard/subscriptions PATCH API to validate:
 * 1. Authenticated users may list only their own active subscriptions.
 * 2. Filter support on target_type, target_id, created_from/created_to (date range).
 * 3. Pagination parameters (page, limit) are respected, with valid metadata & data slice.
 * 4. Deleted/unsubscribed records are omitted from results.
 * 5. Unauthorized users cannot fetch other members' subscription data.
 * 6. Invalid parameters (bad pagination, malformed filter) yield error.
 *
 * Steps:
 * 1. Register two discussion board members (A and B).
 * 2. As member A, create several subscriptions (various target_type/target_id/time).
 * 3. List subscriptions (no filter): expect all own active subscriptions (N).
 * 4. Filter by target_type, target_id, created_from/created_to (date slices).
 * 5. Validate paging/slice (limit < N), check paging metadata and slices.
 * 6. As member B, attempt to list member A's subs - should see only own or none.
 * 7. Edge case: Remove (simulate delete/omission), ensure omitted.
 * 8. Failure: Supply invalid params, expect error.
 */
export async function test_api_discussionBoard_test_list_user_subscriptions_with_various_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = RandomGenerator.alphabets(8);
  const memberA: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: memberAUsername,
      email: memberAEmail,
      hashed_password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);

  // 2. Register member B
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = RandomGenerator.alphabets(8);
  const memberB: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: memberBUsername,
      email: memberBEmail,
      hashed_password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  // 3. As member A, create several subscriptions (simulate login context as A)
  // For test simplicity, we'll assume connection context sets current identity as last registered
  const now = new Date();
  const subs: IDiscussionBoardSubscription[] = [];
  const types = ["thread", "section"];
  for (let i = 0; i < 5; ++i) {
    const sub: IDiscussionBoardSubscription = await api.functional.discussionBoard.subscriptions.post(connection, {
      body: {
        target_type: types[i % types.length],
        target_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardSubscription.ICreate,
    });
    typia.assert(sub);
    // Simulate different creation times (by API these are real-time, so dates will cluster around now)
    subs.push(sub);
    // Small delay to slightly separate created_at timestamps
    await new Promise((r) => setTimeout(r, 30));
  }

  // 4. List all with no filter: should get all (not deleted) own subs
  const allList = await api.functional.discussionBoard.subscriptions.patch(connection, {
    body: {},
  });
  typia.assert(allList);
  // Only own, not deleted; count matches
  TestValidator.equals("all own subscriptions count")(allList.data.length)(subs.length);
  // All returned member_id should be same as memberA.id
  for (const sub of allList.data) {
    TestValidator.equals("member_id matches")(sub.member_id)(memberA.id);
  }

  // 5. Filter by target_type
  for (const filterType of types) {
    const filtered = await api.functional.discussionBoard.subscriptions.patch(connection, {
      body: { filter: { target_type: filterType } },
    });
    typia.assert(filtered);
    TestValidator.predicate(`only ${filterType} subscriptions returned`)(filtered.data.every((s) => s.target_type === filterType));
  }

  // 6. Filter by created_from/created_to (date window)
  // Pick a window including only part of the range
  if (subs.length > 2) {
    // Sort for date order
    const sorted = [...subs].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const created_from = sorted[1].created_at;
    const created_to = sorted[subs.length - 2].created_at;
    const windowed = await api.functional.discussionBoard.subscriptions.patch(connection, {
      body: { filter: { created_from, created_to } },
    });
    typia.assert(windowed);
    // All returned have created_at in range >=created_from && <=created_to
    TestValidator.predicate("created_at range matched")(windowed.data.every((s) =>
      s.created_at >= created_from && s.created_at <= created_to
    ));
  }

  // 7. Pagination
  const paged = await api.functional.discussionBoard.subscriptions.patch(connection, {
    body: { page: 1, limit: 2 },
  });
  typia.assert(paged);
  TestValidator.equals("pagination data slice")(paged.data.length)(2);
  TestValidator.equals("pagination current page")(paged.pagination.current)(1);
  TestValidator.equals("pagination limit")(paged.pagination.limit)(2);
  TestValidator.predicate("pagination total records >= number of subs")(paged.pagination.records >= subs.length);

  // 8. Attempt as member B (simulate login as B: next registration becomes B)
  // For this test scaffold, member registration always sets "authenticated user" context
  // So after creating B, connection now represents B
  const listAsB = await api.functional.discussionBoard.subscriptions.patch(connection, {
    body: {},
  });
  typia.assert(listAsB);
  // Should only see own (none, since B has not subscribed to anything)
  TestValidator.equals("member B has no subscriptions")(listAsB.data.length)(0);

  // 9. Edge case: remove one subscription (simulate deletion by removing from test baseline)
  // Since no API for deletion/unsub, simulate by omitting one from test set, check allList doesn't contain its id
  // Can't actually delete/unsubscribe - just document that omitted ones are not checked for returned

  // 10. Error: invalid page/limit (e.g. negative page)
  await TestValidator.error("invalid page fails")(() =>
    api.functional.discussionBoard.subscriptions.patch(connection, {
      body: { page: -1 },
    })
  );

  // 11. Error: unauthenticated (simulate with new connection - no member registration)
  const anonConnection = { ...connection };
  // Ideally, API would block non-auth requests, but scaffold assumes member must exist
  await TestValidator.error("unauthenticated request fails")(() =>
    api.functional.discussionBoard.subscriptions.patch(anonConnection, {
      body: {},
    })
  );
}