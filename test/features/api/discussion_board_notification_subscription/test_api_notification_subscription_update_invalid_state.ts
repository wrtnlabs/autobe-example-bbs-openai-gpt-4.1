import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSubscription";

/**
 * E2E: Notification subscription update error scenarios (invalid
 * state/data).
 *
 * This test verifies that the system correctly rejects attempts to update a
 * user's notification subscription to an invalid state or with invalid
 * data, enforcing business rules and preventing illegal operations.
 *
 * Business context: Users can follow platform entities (posts, categories,
 * etc.) via notification subscriptions. The API supports "soft unsubscribe"
 * (deleted_at), entity target type changes, and other updates. However,
 * certain state transitions are illegal and should fail:
 *
 * - Attempting to unsubscribe (set deleted_at) a record that is already
 *   deleted/has deleted_at set.
 * - Changing the subscription_target_type to an unsupported or invalid value.
 *
 * Test workflow:
 *
 * 1. Register a user (auth/user/join)
 * 2. Simulate an existing subscription (dummy random data)
 * 3. Attempt PUT update on subscriptionId with: a. deleted_at already set: try
 *    to soft-unsubscribe again (should fail) b. invalid
 *    'subscription_target_type' value (should fail)
 * 4. Assert API returns errors for both forbidden state transitions
 *
 * Note: Since there is no SDK endpoint to create notification
 * subscriptions, the test simulates existing subscriptions by using
 * typia-generated random UUIDs for the subscriptionId. Actual creation or
 * state cannot be verified, so these are treated as negative-path
 * validation only.
 */
export async function test_api_notification_subscription_update_invalid_state(
  connection: api.IConnection,
) {
  // 1. Register user for test context (auth/user/join)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "TestPassword@123";
  const joinRes = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinRes);

  // 2. Simulate existing notification subscription record (random UUIDs)
  const subscriptionId = typia.random<string & tags.Format<"uuid">>();
  const subscriptionTargetId = typia.random<string & tags.Format<"uuid">>();

  // 3a. Attempt to update already deleted subscription (simulate deleted state with deleted_at set)
  const initialDeletedAt = new Date(2023, 0, 1, 10, 0, 0).toISOString();
  const laterDeletedAt = new Date(2023, 0, 2, 12, 0, 0).toISOString();

  // Attempt update: subscription is already "deleted", try to "re-delete"
  await TestValidator.error(
    "cannot soft-unsubscribe subscription a second time",
    async () => {
      await api.functional.discussionBoard.user.notificationSubscriptions.update(
        connection,
        {
          subscriptionId,
          body: {
            deleted_at: laterDeletedAt,
          } satisfies IDiscussionBoardNotificationSubscription.IUpdate,
        },
      );
    },
  );

  // 3b. Attempt to update to invalid target type
  await TestValidator.error(
    "cannot update to an invalid subscription_target_type",
    async () => {
      await api.functional.discussionBoard.user.notificationSubscriptions.update(
        connection,
        {
          subscriptionId,
          body: {
            subscription_target_type: "invalidType",
          } satisfies IDiscussionBoardNotificationSubscription.IUpdate,
        },
      );
    },
  );
}
