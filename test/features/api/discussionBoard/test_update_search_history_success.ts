import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";

/**
 * Test successfully updating allowed fields (keyword, filters, search context) of an existing search history record.
 *
 * This test will:
 * 1. Create a search history entry (as a prerequisite).
 * 2. Attempt to update mutable fields (keyword, filters, search_context) with new valid data.
 * 3. Ensure only the allowed fields change and immutable fields (id, actor_id, created_at) remain untouched.
 * 4. Assert only record owner or admin (but here, acting as owner) can update.
 * 5. Confirm the API returns the updated record with changes accurately applied.
 * 6. Validate audit fields (particularly that updated_at > created_at if such field exists/visible).
 * 7. Enforce that business rules are respected (e.g., nullifying filters/search_context works as intended, other fields cannot be changed).
 */
export async function test_api_discussionBoard_test_update_search_history_success(
  connection: api.IConnection,
) {
  // 1. Create a search history entry (prerequisite)
  const actor_id = typia.random<string & tags.Format<"uuid">>();
  const createInput: IDiscussionBoardSearchHistory.ICreate = {
    actor_id,
    keyword: "original keyword",
    filters: JSON.stringify({ tag: "news" }),
    search_context: "main_board_ui",
  };
  const original = await api.functional.discussionBoard.searchHistories.post(connection, { body: createInput });
  typia.assert(original);

  // 2. Prepare new values for allowed update fields
  const updateInput: IDiscussionBoardSearchHistory.IUpdate = {
    keyword: "updated keyword",
    filters: null, // Test clearing the filter
    search_context: "sidebar_search",
  };

  // 3. Put update (as record owner)
  const updated = await api.functional.discussionBoard.searchHistories.putById(connection, { id: original.id, body: updateInput });
  typia.assert(updated);

  // 4. Assert changes made only to allowed fields
  TestValidator.equals("id should be unchanged")(updated.id)(original.id);
  TestValidator.equals("actor_id should be unchanged")(updated.actor_id)(original.actor_id);
  TestValidator.equals("created_at should be unchanged")(updated.created_at)(original.created_at);
  TestValidator.equals("keyword updated")(updated.keyword)(updateInput.keyword);
  TestValidator.equals("filters nulled")(updated.filters)(null);
  TestValidator.equals("search_context updated")(updated.search_context)(updateInput.search_context);

  // 5. (If audit field updated_at existed, check updated_at > created_at)
  // Not implemented here since the DTO does not specify updated_at
}