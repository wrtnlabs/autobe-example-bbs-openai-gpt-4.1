import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";
import type { IPageIDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationPreference";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify notification preferences retrieval for a new user with no
 * preferences.
 *
 * 1. Register a new user on /auth/user/join (unique email and username, with
 *    random password and consent set to true).
 * 2. Authenticate as this user (SDK does this automatically on join).
 * 3. Immediately call PATCH /discussionBoard/user/notificationPreferences with
 *    an empty IRequest object.
 * 4. Assert that the returned result is a valid page but contains no data
 *    (empty preferences array for this user).
 * 5. Validate all pagination fields are present, current page is 1 (default),
 *    and records and pages are 0, limit equals default page size (undefined
 *    returns system default).
 * 6. Confirm no unauthorized or system error occurs and only default/null
 *    preference state is observed.
 * 7. Confirm data is strictly empty array and conforms to the expected types.
 */
export async function test_api_notification_preferences_list_empty(
  connection: api.IConnection,
) {
  // 1. Register a new user with unique credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  // Password: min 10 characters, must have uppercase, number, special character
  // Adding 'A#1' at end to ensure policy compliance
  const password = RandomGenerator.alphaNumeric(12) + "A#1";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Immediately query notification preferences (no prior customizations)
  const result =
    await api.functional.discussionBoard.user.notificationPreferences.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardNotificationPreference.IRequest,
      },
    );
  typia.assert(result);

  // 3. Assert that preferences list is empty and pagination metadata is valid
  TestValidator.equals("Empty preferences list after join", result.data, []);
  TestValidator.equals(
    "pagination: current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination: no records", result.pagination.records, 0);
  TestValidator.equals(
    "pagination: pages should be 0",
    result.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination: limit is positive integer",
    result.pagination.limit > 0,
  );
}
