import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate retrieval of a specific discussion_board_category by its UUID.
 *
 * This test simulates the typical admin or moderator workflow:
 * 1. Create a new category in the discussion board (POST /discussionBoard/categories)
 * 2. Fetch the newly created category by its ID using GET /discussionBoard/categories/{id}
 * 3. Validate the details—ensure all metadata fields (id, name, description, timestamps, status) are present and correct
 * 4. Ensure the retrieved record matches the data just created
 *
 * This tests relevant business rules:
 * - Ensures the GET endpoint actually returns the correct category by its UUID
 * - Ensures all specified fields are non-empty and consistent (e.g. id uniqueness, correct name/description values, created_at matches, etc)
 * - Sanity checks that soft-deletion (deleted_at) is not set for fresh categories
 * - Validates field types using typia.assert and correct correspondence of returned data to created input
 */
export async function test_api_discussionBoard_test_get_category_detail_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a new discussion board category using the POST endpoint
  const categoryInput: IDiscussionBoardCategory.ICreate = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph()(1),
  };
  const created: IDiscussionBoardCategory = await api.functional.discussionBoard.categories.post(connection, {
    body: categoryInput,
  });
  typia.assert(created);

  // 2. Fetch the category by its UUID using the GET endpoint
  const fetched: IDiscussionBoardCategory = await api.functional.discussionBoard.categories.getById(connection, {
    id: created.id,
  });
  typia.assert(fetched);

  // 3. Validate the details
  TestValidator.equals("id matches")(fetched.id)(created.id);
  TestValidator.equals("name matches")(fetched.name)(categoryInput.name);
  TestValidator.equals("description matches")(fetched.description ?? null)(categoryInput.description ?? null);
  TestValidator.predicate("created_at format is ISO8601")(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z/.test(fetched.created_at));
  TestValidator.equals("created_at matches")(fetched.created_at)(created.created_at);
  TestValidator.equals("updated_at matches")(fetched.updated_at)(created.updated_at);
  TestValidator.equals("deleted_at null for new record")(fetched.deleted_at ?? null)(null);
}