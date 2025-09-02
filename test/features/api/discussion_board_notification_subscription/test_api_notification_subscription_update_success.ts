import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSubscription";

/**
 * Validate successful update of a user's notification subscription
 * settings.
 *
 * This test:
 *
 * - Registers a new user via /auth/user/join to establish authentication
 * - Simulates creation of a notification subscription (since no 'create'
 *   endpoint exists)
 * - Performs a PUT update on
 *   /discussionBoard/user/notificationSubscriptions/{subscriptionId} with
 *   valid simple changes:
 *
 *   - Mutate one updatable property (subscription_target_type,
 *       subscription_target_id, or set deleted_at for soft-unsubscribe)
 * - Confirms the returned object reflects the update while preserving user
 *   ownership and other key fields
 * - Ensures only properties allowed by IUpdate are mutated, and other fields
 *   remain unchanged
 */
export async function test_api_notification_subscription_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain credentials
  const userRegInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: `Pw1!${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;

  const authorized = await api.functional.auth.user.join(connection, {
    body: userRegInput,
  });
  typia.assert(authorized);

  // Simulate an existing notification subscription for this user (since no create API is available)
  // Fields must strictly match schema and simulate a plausible, current record
  const subscriptionId = typia.random<string & tags.Format<"uuid">>();
  const original = {
    id: subscriptionId,
    user_id: authorized.user.id,
    subscription_target_type: "thread", // plausible subscription target type
    subscription_target_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IDiscussionBoardNotificationSubscription;

  // Perform a valid update: set deleted_at to now for a soft unsubscribe
  const updateBody = {
    deleted_at: new Date().toISOString(),
  } satisfies IDiscussionBoardNotificationSubscription.IUpdate;

  const updated =
    await api.functional.discussionBoard.user.notificationSubscriptions.update(
      connection,
      {
        subscriptionId: original.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Assert that the returned record reflects the update and preserves key invariants
  TestValidator.equals("subscription id unchanged", updated.id, original.id);
  TestValidator.equals(
    "user id is unchanged and matches authorized user",
    updated.user_id,
    authorized.user.id,
  );
  TestValidator.equals(
    "deleted_at updated as requested",
    updated.deleted_at,
    updateBody.deleted_at,
  );
  TestValidator.equals(
    "subscription_target_type unchanged",
    updated.subscription_target_type,
    original.subscription_target_type,
  );
  TestValidator.equals(
    "subscription_target_id unchanged",
    updated.subscription_target_id,
    original.subscription_target_id,
  );
}
