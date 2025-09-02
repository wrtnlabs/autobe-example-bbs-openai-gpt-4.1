import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Test successful retrieval of a notification detail for an authenticated
 * user.
 *
 * This test ensures that only the recipient user can access notification
 * details using the GET
 * /discussionBoard/user/notifications/{notificationId} endpoint. Workflow:
 *
 * 1. Register a new user (recipient) via the join endpoint, saving
 *    authentication context.
 * 2. Manually create (mock) a notification entity for that user (since
 *    notification creation cannot be done through public API).
 * 3. Retrieve the notification as the authenticated user; verify all fields
 *    match, using TestValidator.equals with exception for created_at if
 *    needed.
 * 4. Register a second user and attempt to access the first user's
 *    notification, ensuring permission is denied (using
 *    TestValidator.error).
 */
export async function test_api_notification_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register recipient user
  const primaryUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "TestPassword1!",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(primaryUser);

  // 2. Mock a notification record for the user (since API exposes no write endpoint)
  const notification: IDiscussionBoardNotification = {
    id: typia.random<string & tags.Format<"uuid">>(),
    recipient_user_id: primaryUser.user.id,
    actor_user_id: null,
    post_id: null,
    comment_id: null,
    type: "generic",
    status: "unread",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    action_url: null,
    failure_reason: null,
    created_at: new Date().toISOString(),
    delivered_at: null,
    read_at: null,
    deleted_at: null,
  };
  typia.assert(notification);

  // 3. Retrieve notification as recipient
  const fetched = await api.functional.discussionBoard.user.notifications.at(
    connection,
    {
      notificationId: notification.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "Returned notification matches mock and belongs to recipient user",
    fetched,
    notification,
    (key) => key === "created_at",
  );

  // 4. Register a different user
  const otherUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "TestPassword2!",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(otherUser);

  // SDK stores auth token in connection; now context is otherUser
  // Attempt to retrieve notification as outsider - should throw
  await TestValidator.error(
    "Non-recipient user cannot access another user's notification",
    async () => {
      await api.functional.discussionBoard.user.notifications.at(connection, {
        notificationId: notification.id,
      });
    },
  );
}
