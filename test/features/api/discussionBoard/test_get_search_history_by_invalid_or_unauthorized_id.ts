import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";

/**
 * Validate error responses when retrieving a discussion board search history record in invalid or unauthorized scenarios.
 *
 * This E2E test ensures the API returns correct errors on:
 *   - Attempting to fetch a non-existent search history record.
 *   - Attempting to fetch a record after it was deleted.
 *   - (If applicable) Attempting to fetch a record as an unauthorized/other actor.
 *   - Ensures that no sensitive data is leaked in error responses.
 *
 * Steps:
 * 1. Attempt to retrieve a search history record by a random (guaranteed-non-existent) UUID and expect a 404 Not Found error.
 * 2. Create a valid search history record, then delete it. Attempt to retrieve it again and expect a 404 Not Found error.
 * 3. (If permissions system exists) Try to retrieve a record as another/unauthorized actor and expect a 403 Forbidden error.
 *
 * All errors should be type-checked and not contain sensitive details.
 */
export async function test_api_discussionBoard_test_get_search_history_by_invalid_or_unauthorized_id(
  connection: api.IConnection,
) {
  // 1. Attempt to get a non-existent record by random UUID
  await TestValidator.error("get non-existent record should fail")(
    async () => {
      await api.functional.discussionBoard.searchHistories.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>()
      });
    }
  );

  // 2. Create and then delete a record, ensure it can't be retrieved
  const created = await api.functional.discussionBoard.searchHistories.post(connection, {
    body: {
      actor_id: typia.random<string & tags.Format<"uuid">>(),
      keyword: "test-keyword",
      filters: null,
      search_context: null,
    },
  });
  typia.assert(created);
  const erased = await api.functional.discussionBoard.searchHistories.eraseById(connection, {
    id: created.id,
  });
  typia.assert(erased);
  await TestValidator.error("get deleted record should fail")(
    async () => {
      await api.functional.discussionBoard.searchHistories.getById(connection, {
        id: created.id,
      });
    }
  );

  // 3. (Authorization check) If API enforces permissions, try unauthorized access. Not implemented in this test as no auth/user context provided.
}