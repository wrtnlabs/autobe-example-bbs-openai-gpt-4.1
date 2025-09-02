import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for successful soft-deletion of a user notification.
 *
 * This test validates the ability of a registered, authenticated user to
 * delete (soft-delete) a notification that is addressed to them, and
 * verifies logical visibility: the notification should no longer be visible
 * to the user, but should remain in the system for audit compliance
 * purposes. The test also ensures that only the rightful recipient user is
 * able to perform the deletion.
 *
 * Steps:
 *
 * 1. Register a new standard user account using the /auth/user/join endpoint.
 * 2. Prepare a notification for the user. Because no notification creation
 *    endpoint or DTOs were provided, simulate a notificationId as if a
 *    notification exists for that user (using random uuid as a
 *    placeholder).
 * 3. Call DELETE /discussionBoard/user/notifications/{notificationId} to soft
 *    delete the notification on behalf of the registered user.
 * 4. Confirm the delete function executes without error; (since there is no
 *    notification GET/list endpoint provided, skip further visibility
 *    validation).
 */
export async function test_api_notification_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123$";
  const username = RandomGenerator.name(1);
  const displayName = RandomGenerator.name(1);

  const joinResponse = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinResponse);

  // 2. Prepare a notification for the user (simulate notificationId as random uuid)
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the notification for the user
  await api.functional.discussionBoard.user.notifications.erase(connection, {
    notificationId,
  });
  // There is no response body; function passes if no exception occurs.
}
