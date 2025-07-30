import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error handling in advanced session filter for malformed queries.
 *
 * This test ensures that the admin PATCH endpoint for session analytics
 * robustly rejects invalid filter/query input:
 *
 * - Invalid enum/type for actor_type
 * - Out-of-range pagination params (negative page/limit)
 *
 * Steps:
 *
 * 1. Try search with invalid actor_type (should be 'admin', 'moderator', 'member',
 *    'guest' only), expect error.
 * 2. Try search with page = -1, expect error.
 * 3. Try search with limit = -5, expect error.
 */
export async function test_api_discussionBoard_test_advanced_search_with_invalid_query_returns_error(
  connection: api.IConnection,
) {
  // 1. Invalid actor_type value (e.g., not 'admin', 'moderator', 'member', 'guest')
  await TestValidator.error(
    "invalid actor_type should trigger validation error",
  )(async () => {
    await api.functional.discussionBoard.admin.userSessions.search(connection, {
      body: {
        actor_type: "superuser",
      },
    });
  });

  // 2. Negative page number
  await TestValidator.error("negative page should trigger validation error")(
    async () => {
      await api.functional.discussionBoard.admin.userSessions.search(
        connection,
        {
          body: {
            page: -1,
          },
        },
      );
    },
  );

  // 3. Negative limit value
  await TestValidator.error("negative limit should trigger validation error")(
    async () => {
      await api.functional.discussionBoard.admin.userSessions.search(
        connection,
        {
          body: {
            limit: -5,
          },
        },
      );
    },
  );
}
