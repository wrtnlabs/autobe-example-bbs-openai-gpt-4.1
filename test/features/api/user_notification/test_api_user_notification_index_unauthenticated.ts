import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Ensure unauthenticated users cannot access notification feed.
 *
 * This test verifies the privacy boundary for the notification feed:
 *
 * 1. Register a valid user via /auth/user/join to ensure the system is
 *    initialized and a user context exists.
 * 2. Simulate a logged-out state by creating a fresh connection with no
 *    Authorization header present.
 * 3. Attempt to list notifications with PATCH
 *    /discussionBoard/user/notifications as an unauthenticated client.
 * 4. Assert that this action results in an authentication error (HTTP
 *    401/403), confirming only authenticated users can retrieve their
 *    notifications.
 * 5. The test confirms business logic: under no circumstances should a
 *    non-authenticated user be able to receive notifications.
 */
export async function test_api_user_notification_index_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Register a user to ensure the notifications API context is initialized
  typia.assert(
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12) + "Ab!",
        display_name: RandomGenerator.name(),
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    }),
  );

  // 2. Simulate logout (remove Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt to access notifications as unauthenticated
  await TestValidator.error(
    "unauthenticated user cannot access notifications feed",
    async () => {
      await api.functional.discussionBoard.user.notifications.index(
        unauthConn,
        {
          body: {}, // minimal, valid IRequest; filters are not evaluated if unauthenticated
        },
      );
    },
  );
}
