import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSubscription";
import type { IPageIDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test retrieval of own notification subscription list with pagination and
 * filters.
 *
 * Scenario:
 *
 * 1. Register a new user via /auth/user/join with randomized, valid info.
 * 2. Using the established authentication context (Authorization header), call
 *    PATCH /discussionBoard/user/notificationSubscriptions with body
 *    parameters for pagination and assorted filters (page, limit,
 *    subscription_target_type, sort, keyword).
 * 3. Validate the result: a. Response should be HTTP 200 (success) b. Only
 *    subscriptions owned by the newly registered user are returned c.
 *    Pagination metadata is well-formed and consistent with actual result
 *    set d. As this is a new user and there's no documented endpoint for
 *    subscription creation, the returned data array should be empty, and
 *    records/pages metadata match zero results e. Filter parameters do not
 *    cause errors and do not expose other users’ data
 */
export async function test_api_notification_subscription_list_success(
  connection: api.IConnection,
) {
  // 1. Register a user and obtain authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "Testpassw0rd!";
  const displayName = RandomGenerator.name(1);
  const input = {
    email,
    username,
    password,
    display_name: displayName,
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;

  const authorized = await api.functional.auth.user.join(connection, {
    body: input,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "registered user's email matches",
    authorized.user.email,
    email,
  );
  TestValidator.equals(
    "registered user's username matches",
    authorized.user.username,
    username,
  );
  TestValidator.predicate(
    "received token contains access token",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );

  // 2. Attempt to retrieve own notification subscriptions (should be empty)
  const req: IDiscussionBoardNotificationSubscription.IRequest = {
    page: 1,
    limit: 20,
    subscription_target_type: RandomGenerator.pick([
      "post",
      "thread",
      "category",
      "tag",
    ] as const),
    sort: "-created_at",
    keyword: RandomGenerator.name(1),
  };
  const res =
    await api.functional.discussionBoard.user.notificationSubscriptions.index(
      connection,
      {
        body: req,
      },
    );
  typia.assert(res);
  // 3. Validate result: data must be empty for a new user
  TestValidator.equals(
    "notification subscriptions for new user are empty",
    res.data.length,
    0,
  );
  TestValidator.equals(
    "pagination on empty result: records is 0",
    res.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination on empty result: pages is 0",
    res.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page matches request",
    res.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    res.pagination.limit,
    20,
  );
}
