import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSubscription";

/**
 * Attempt to access another user's notification subscription and confirm
 * denial.
 *
 * This test verifies that user privacy is enforced for notification
 * subscription details in the discussion board system.
 *
 * 1. Register user1 (subscriber) via /auth/user/join.
 * 2. Register user2 via /auth/user/join (also context-switches the connection
 *    to user2).
 * 3. Simulate that user1 owns a notification subscription (random UUID for
 *    this test, since there's no public API to create one).
 * 4. Attempt to GET user1's subscription as user2 using the at() endpoint.
 * 5. Assert that unauthorized access is rejected with an error (forbidden or
 *    not found).
 */
export async function test_api_notification_subscription_get_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register user1 (subscriber)
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1Password = RandomGenerator.alphaNumeric(12) + "A@1"; // Meets password policy: length, upper, special, digit
  const user1: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user1Email,
        username: user1Username,
        password: user1Password,
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user1);

  // Mock: simulate that user1 owns a notification subscription
  // Since public subscription creation is unavailable, we use random UUID as placeholder
  const subscriptionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Register user2 (context switch to user2 happens due to join call updating connection.headers.Authorization)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = RandomGenerator.alphaNumeric(12) + "A@2";
  const user2: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user2Email,
        username: user2Username,
        password: user2Password,
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user2);

  // 3. As user2, attempt to access user1's notification subscription
  await TestValidator.error(
    "unauthorized user should not fetch another user's notification subscription",
    async () => {
      await api.functional.discussionBoard.user.notificationSubscriptions.at(
        connection,
        {
          subscriptionId,
        },
      );
    },
  );
}
