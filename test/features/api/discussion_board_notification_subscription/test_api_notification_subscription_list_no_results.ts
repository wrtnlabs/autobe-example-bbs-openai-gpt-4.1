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
 * Validate that fetching notification subscriptions for a newly registered
 * user returns an empty paginated result.
 *
 * This test ensures that when a user with no notification subscriptions
 * issues a PATCH request to
 * /discussionBoard/user/notificationSubscriptions, the API returns a valid,
 * empty IPageIDiscussionBoardNotificationSubscription.ISummary structure
 * (rather than an error) with proper pagination metadata.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user (POST /auth/user/join)
 * 2. Without creating any notification subscriptions, invoke PATCH
 *    /discussionBoard/user/notificationSubscriptions as this user
 * 3. Assert that the returned 'data' list is empty and pagination shows
 *    records=0, pages=0, current=1
 */
export async function test_api_notification_subscription_list_no_results(
  connection: api.IConnection,
) {
  // 1. Register a new user (auth & session)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name().replace(/\s+/g, "_").toLowerCase();
  const password = "Testpassw0rd!";
  const displayName = RandomGenerator.name();

  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(registration);

  // 2. Fetch notification subscriptions with no prior subscriptions
  const response =
    await api.functional.discussionBoard.user.notificationSubscriptions.index(
      connection,
      {
        body: {}, // No filters, test base case
      },
    );
  typia.assert(response);

  // 3. Validate the response structure for empty result
  TestValidator.equals(
    "result should be paginated and empty",
    Array.isArray(response.data) && response.data.length,
    0,
  );
  TestValidator.equals(
    "pagination record count should be zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination page count should be zero",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive integer",
    response.pagination.limit > 0 &&
      Number.isInteger(response.pagination.limit),
  );
}
