import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSubscription";

/**
 * Test denial of notification subscription update by unauthorized user.
 *
 * Validates that a notification subscription can only be updated by its
 * owner; attempts by another user result in a proper auth error.
 *
 * Scenario:
 *
 * 1. Register user1 (owner).
 * 2. User1 creates a notification subscription record (e.g., following a
 *    post).
 * 3. Register user2 (attacker), which switches authentication context.
 * 4. User2 attempts to update user1's notification subscription via PUT
 *    /discussionBoard/user/notificationSubscriptions/{subscriptionId}.
 * 5. Validate that the update attempt fails with an authentication (ownership)
 *    error.
 *
 * Note: Since no public API exists to create a notification subscription
 * directly, the test simulates the presence of such a record for user1.
 */
export async function test_api_notification_subscription_update_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register user1 (owner)
  const user1Reg = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "Password1!", // meets policy
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1Reg.user);

  // -- Simulate creation of notification subscription owned by user1 --
  // No API exists to create a notification subscription; normally this would be set up through a real call or fixture.
  const subscription: IDiscussionBoardNotificationSubscription = {
    id: typia.random<string & tags.Format<"uuid">>(),
    user_id: user1Reg.user.id,
    subscription_target_type: "thread",
    subscription_target_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 2. Register user2 (attacker), which switches authentication context
  const user2Reg = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "Password1!", // meets policy
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2Reg.user);

  // 3. User2 attempts to update user1's notification subscription
  await TestValidator.error(
    "should not allow user2 to update another user's notification subscription",
    async () => {
      await api.functional.discussionBoard.user.notificationSubscriptions.update(
        connection,
        {
          subscriptionId: subscription.id,
          body: {
            subscription_target_type: "thread",
            subscription_target_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            deleted_at: new Date().toISOString(),
          } satisfies IDiscussionBoardNotificationSubscription.IUpdate,
        },
      );
    },
  );
}
