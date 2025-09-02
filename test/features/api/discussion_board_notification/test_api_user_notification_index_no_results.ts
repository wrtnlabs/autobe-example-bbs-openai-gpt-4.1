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
 * Validate that a newly registered user receives an empty notification list
 * and correct pagination when no notifications exist.
 *
 * Scenario Steps:
 *
 * 1. Register a new user account on the discussion board (providing email,
 *    username, password, display name [optional], and consent).
 * 2. No triggering events for notifications are created.
 * 3. The authenticated user lists notifications using the PATCH
 *    /discussionBoard/user/notifications endpoint (with empty filter/body
 *    params).
 * 4. Assert that the data array is empty.
 * 5. Check that pagination metadata (current, limit, records, pages) is
 *    correct and consistent with zero notifications.
 * 6. Validate all response types and key structure with typia.assert.
 */
export async function test_api_user_notification_index_no_results(
  connection: api.IConnection,
) {
  // 1. Register a new user (with explicit consent)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(12) + "A1!"; // Password policy: 10+ chars, uppercase, number, special
  const displayName = RandomGenerator.name();
  const authorized = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(authorized);

  // 2. User performs no activity that triggers notifications
  // (No operation required)

  // 3. List notifications (expect empty)
  const output = await api.functional.discussionBoard.user.notifications.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardNotification.IRequest,
    },
  );
  typia.assert(output);

  // 4. Assert that "data" is an empty array
  TestValidator.equals(
    "data array should be empty for user with no notifications",
    output.data,
    [],
  );

  // 5. Check pagination metadata for zero records and correct values
  TestValidator.equals(
    "pagination.records should be 0 for user with no notifications",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.current should be 1 by default",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.pages should be 0 (or API may return 1)",
    output.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination.limit should be present and > 0",
    output.pagination.limit > 0,
  );
}
