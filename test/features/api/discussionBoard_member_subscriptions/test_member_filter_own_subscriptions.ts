import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates a member's ability to filter their own discussion board
 * subscriptions by various criteria using PATCH
 * /discussionBoard/member/subscriptions, ensuring scoping only returns that
 * member's subscriptions despite the presence of other users' subscriptions in
 * the system.
 *
 * This test proceeds as follows:
 *
 * 1. Create another member's subscriptions using the admin endpoint to seed
 *    unrelated data (simulate 'other users exist').
 * 2. As the target test member, create several subscriptions of both 'topic' and
 *    'thread' types, using various notification methods and active/inactive
 *    statuses.
 * 3. For each filter criteria (by target type, by notification method, by
 *    is_active):
 *
 *    - Issue a PATCH filter operation as the member
 *    - Ensure only subscriptions for the authenticated member are returned
 *    - Ensure the returned subscriptions match the specific filter used (type,
 *         notification_method, is_active)
 *    - Test edge case: apply a filter that should return zero results, confirm empty
 *         array
 * 4. Confirm pagination response shape is always valid.
 */
export async function test_api_discussionBoard_member_subscriptions_test_member_filter_own_subscriptions(
  connection: api.IConnection,
) {
  // 1. Create another member's subscriptions for access isolation test
  const otherMemberId = typia.random<string & tags.Format<"uuid">>();
  const unrelatedSubscription =
    await api.functional.discussionBoard.admin.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: otherMemberId,
          target_type: "topic",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          notification_method: "email",
          is_active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(unrelatedSubscription);

  // 2. Create multiple subscriptions for the authenticated member
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // In an actual system, proper authentication switching logic would be used for this member.
  // Here, only the subscriber_id value reflects intended test subject.
  const mySubs: IDiscussionBoardSubscription[] = await Promise.all([
    api.functional.discussionBoard.member.subscriptions.create(connection, {
      body: {
        subscriber_id: memberId,
        target_type: "topic",
        target_id: typia.random<string & tags.Format<"uuid">>(),
        notification_method: "email",
        is_active: true,
      } satisfies IDiscussionBoardSubscription.ICreate,
    }),
    api.functional.discussionBoard.member.subscriptions.create(connection, {
      body: {
        subscriber_id: memberId,
        target_type: "thread",
        target_id: typia.random<string & tags.Format<"uuid">>(),
        notification_method: "in-app",
        is_active: false,
      } satisfies IDiscussionBoardSubscription.ICreate,
    }),
    api.functional.discussionBoard.member.subscriptions.create(connection, {
      body: {
        subscriber_id: memberId,
        target_type: "topic",
        target_id: typia.random<string & tags.Format<"uuid">>(),
        notification_method: "in-app",
        is_active: true,
      } satisfies IDiscussionBoardSubscription.ICreate,
    }),
  ]);
  mySubs.forEach((s) => typia.assert(s));

  // 3a. Filter by target_type (e.g. "topic")
  const typeFiltered =
    await api.functional.discussionBoard.member.subscriptions.search(
      connection,
      {
        body: {
          target_type: "topic",
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  typia.assert(typeFiltered);
  TestValidator.predicate("type filter - only member's records")(
    typeFiltered.data.every(
      (s) => s.subscriber_id === memberId && s.target_type === "topic",
    ),
  );
  TestValidator.equals("type filter - count matches")(typeFiltered.data.length)(
    mySubs.filter((s) => s.target_type === "topic").length,
  );

  // 3b. Filter by notification_method (e.g. "in-app")
  const methodFiltered =
    await api.functional.discussionBoard.member.subscriptions.search(
      connection,
      {
        body: {
          notification_method: "in-app",
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  typia.assert(methodFiltered);
  TestValidator.predicate("method filter - only member's records")(
    methodFiltered.data.every(
      (s) => s.subscriber_id === memberId && s.notification_method === "in-app",
    ),
  );
  TestValidator.equals("notification_method filter - count matches")(
    methodFiltered.data.length,
  )(mySubs.filter((s) => s.notification_method === "in-app").length);

  // 3c. Filter by is_active (true)
  const activeFiltered =
    await api.functional.discussionBoard.member.subscriptions.search(
      connection,
      {
        body: {
          is_active: true,
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  typia.assert(activeFiltered);
  TestValidator.predicate("is_active filter - only member's active records")(
    activeFiltered.data.every(
      (s) => s.subscriber_id === memberId && s.is_active === true,
    ),
  );
  TestValidator.equals("is_active filter - count matches")(
    activeFiltered.data.length,
  )(mySubs.filter((s) => s.is_active === true).length);

  // 3d. Edge case: Apply a filter guaranteed to return no match
  const emptyFiltered =
    await api.functional.discussionBoard.member.subscriptions.search(
      connection,
      {
        body: {
          target_type: "nonexistent",
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  typia.assert(emptyFiltered);
  TestValidator.equals("empty filter yields no data")(
    emptyFiltered.data.length,
  )(0);

  // 4. Validate structure of expected pagination for all responses
  [typeFiltered, methodFiltered, activeFiltered, emptyFiltered].forEach(
    (page) => {
      typia.assert(page.pagination);
      TestValidator.predicate("pagination current positive")(
        page.pagination.current > 0,
      );
      TestValidator.predicate("pagination limit positive")(
        page.pagination.limit > 0,
      );
      TestValidator.predicate("pagination records nonnegative")(
        page.pagination.records >= 0,
      );
      TestValidator.predicate("pagination pages positive")(
        page.pagination.pages > 0,
      );
    },
  );
}
