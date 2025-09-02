import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Test negative notification retrieval (not found) for discussion board
 * user.
 *
 * Validates API error handling by attempting to fetch a notification
 * resource using a random UUID that does not correspond to any real or
 * active notification ID (i.e., non-existent). This ensures that the API
 * does not expose notification details to invalid identifiers and that
 * well-formed errors (preferably 404) are returned to authenticated users.
 *
 * Workflow:
 *
 * 1. Register a new standard user (establishes authentication context).
 * 2. Attempt to fetch a notification using a random UUID never created as a
 *    notification.
 * 3. Validate that the API responds with a not-found error (ideally 404), and
 *    no notification is returned.
 *
 * No notification creation or deletion is required, as the random UUID is
 * extremely unlikely to exist in the notification table.
 */
export async function test_api_notification_retrieve_not_found(
  connection: api.IConnection,
) {
  // 1. Register a user (join)
  const joinInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12) + "A!1",
    display_name: RandomGenerator.name(),
    consent: true,
  };
  const userAuth = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(userAuth);

  // 2. Attempt to fetch a notification using a random UUID which cannot exist
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Expect an error (ideally 404 Not Found) from the API call
  await TestValidator.httpError(
    "retrieving non-existent notification returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.user.notifications.at(connection, {
        notificationId: nonExistentNotificationId,
      });
    },
  );
}
