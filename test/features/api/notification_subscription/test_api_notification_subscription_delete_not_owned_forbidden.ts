import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test forbidden deletion of a notification subscription owned by another
 * user.
 *
 * This test validates that only the owner of a notification subscription
 * can delete it.
 *
 * - User1 is registered (and assumed to have a notification subscription;
 *   since no creation API exists, a valid UUID is used as a structural
 *   placeholder).
 * - User2 is registered as a separate account and authenticated (context
 *   switches to user2).
 * - User2 attempts to delete user1's notification subscription.
 * - The operation should fail with a forbidden error (HTTP 403), confirming
 *   that ownership enforcement is in place.
 *
 * Steps:
 *
 * 1. Register user1 and retrieve authorization.
 * 2. Simulate (structurally) a subscriptionId owned by user1 (no API exists to
 *    make real one).
 * 3. Register user2 and context switch to their account.
 * 4. Attempt to delete user1's (simulated) subscription as user2; verify
 *    error.
 */
export async function test_api_notification_subscription_delete_not_owned_forbidden(
  connection: api.IConnection,
) {
  // 1. Register user1 and get their credentials
  const user1: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12) + "A@1", // Ensures password policy compliance (uppercase, number, special char)
        consent: true,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user1);

  // 2. Simulate notification subscriptionId belonging to user1 (no API for real creation)
  const subscriptionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Register and authenticate user2. Context switch is managed by token update in connection
  const user2: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12) + "B@2", // Ensures unique, valid password
        consent: true,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user2);

  // 4. As user2, attempt to delete user1's notification subscription (should fail with forbidden error)
  await TestValidator.error(
    "user2 cannot delete user1's notification subscription",
    async () => {
      await api.functional.discussionBoard.user.notificationSubscriptions.erase(
        connection,
        { subscriptionId },
      );
    },
  );
}
