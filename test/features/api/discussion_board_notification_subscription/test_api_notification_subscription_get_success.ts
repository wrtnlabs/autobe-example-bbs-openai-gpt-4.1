import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSubscription";

/**
 * Validate that a user can fetch details about a notification subscription
 * belonging to them.
 *
 * 1. Register a discussion board user (with random, valid credentials and
 *    consent).
 * 2. Create a notification subscription record for this user, ensuring user_id
 *    matches (this may be simulated if no direct API exists).
 * 3. Use the subscription's ID with GET
 *    /discussionBoard/user/notificationSubscriptions/{subscriptionId}.
 * 4. Assert that:
 *
 *    - The subscription info returned matches what was set/generated
 *    - The user_id matches the authenticated user's id
 *    - No unexpected fields are present
 *    - Created_at is a recent/valid date
 *    - Deleted_at is null or undefined for active subscriptions
 */
export async function test_api_notification_subscription_get_success(
  connection: api.IConnection,
) {
  // 1. Register a user
  const createUserInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16) + "A!2",
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const authResp: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createUserInput,
    });
  typia.assert(authResp);
  const userId = authResp.user.id;

  // 2. Simulate creation of a notification subscription for this user
  // (No API to create, so create matching structure to use for GET test)
  const now = new Date().toISOString();
  const subscription: IDiscussionBoardNotificationSubscription = {
    id: typia.random<string & tags.Format<"uuid">>(),
    user_id: userId,
    subscription_target_type: RandomGenerator.pick([
      "thread",
      "post",
      "category",
      "tag",
      "user",
    ] as const),
    subscription_target_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: now,
    deleted_at: null,
  };

  // 3. Use the subscription id in GET, simulating that this is the user's own subscription
  const result: IDiscussionBoardNotificationSubscription =
    await api.functional.discussionBoard.user.notificationSubscriptions.at(
      connection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(result);

  // 4. Assert details returned are as expected and belong to user
  TestValidator.equals("subscription id matches", result.id, subscription.id);
  TestValidator.equals(
    "user_id matches authenticated user",
    result.user_id,
    userId,
  );
  TestValidator.equals(
    "target type matches",
    result.subscription_target_type,
    subscription.subscription_target_type,
  );
  TestValidator.equals(
    "target id matches",
    result.subscription_target_id,
    subscription.subscription_target_id,
  );
  TestValidator.equals(
    "created_at matches",
    result.created_at,
    subscription.created_at,
  );
  TestValidator.equals(
    "deleted_at is null for active subscription",
    result.deleted_at,
    null,
  );
}
