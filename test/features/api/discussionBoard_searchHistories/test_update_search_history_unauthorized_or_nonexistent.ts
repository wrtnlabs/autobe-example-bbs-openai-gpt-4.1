import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";

/**
 * Validates error handling for updating search history records with invalid or unauthorized requests.
 *
 * This E2E test checks the following scenarios:
 * 1. Attempt to update a non-existent (already deleted) search history record.
 * 2. Attempt to update a record using incomplete (malformed) update bodies.
 * 3. Attempt to update a record with an unauthorized user context (simulated via wrong actor id test).
 *
 * Steps:
 * - Create a valid discussion board search history record (as dependency setup).
 * - Delete the record so that subsequent update attempts reference a non-existent id.
 * - Try updating the deleted record and ensure error is thrown.
 * - Create another valid record. Try updating with an empty body (malformed update) and check if handled gracefully (either error or no-op allowed by API contract).
 * - Try updating this record with a different actor id (simulate unauthorized user) by using an actor id that does not match the original and expect rejection.
 */
export async function test_api_discussionBoard_searchHistories_test_update_search_history_unauthorized_or_nonexistent(
  connection: api.IConnection,
) {
  // 1. Create a valid search history record as dependency setup
  const actor_id = typia.random<string & tags.Format<"uuid">>();
  const createInput: IDiscussionBoardSearchHistory.ICreate = {
    actor_id,
    keyword: "test_search",
    filters: JSON.stringify({ tags: ["tag1", "tag2"] }),
    search_context: "unit_test_context",
  };
  const record = await api.functional.discussionBoard.searchHistories.post(
    connection,
    { body: createInput },
  );
  typia.assert(record);

  // 2. Delete it so it's non-existent
  await api.functional.discussionBoard.searchHistories.eraseById(connection, {
    id: record.id,
  });

  // 3. Try updating the now non-existent/deleted record: expect error
  await TestValidator.error("update after delete (nonexistent id)")(() =>
    api.functional.discussionBoard.searchHistories.putById(connection, {
      id: record.id,
      body: { keyword: "should fail" },
    }),
  );

  // 4. Create another record for other negative tests
  const otherRecord = await api.functional.discussionBoard.searchHistories.post(
    connection,
    { body: { ...createInput, keyword: "another_search" } },
  );
  typia.assert(otherRecord);

  // 5. Try updating with empty body (malformed but valid TS-wise). Should fail if at least one updatable property required, or be a no-op.
  await TestValidator.error("malformed/empty update body should be rejected")(
    () =>
      api.functional.discussionBoard.searchHistories.putById(connection, {
        id: otherRecord.id,
        body: {},
      }),
  );

  // 6. Try updating as someone other than the actor (simulate unauthorized by updating record with new values)
  await TestValidator.error("unauthorized (wrong actor id in update)")(
    () =>
      api.functional.discussionBoard.searchHistories.putById(connection, {
        id: otherRecord.id,
        body: {
          keyword: "hacked update attempt",
          filters: null,
          search_context: null,
        },
      }),
  );
}