import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate admin cannot create duplicate discussion board category names.
 *
 * This test ensures that the uniqueness constraint on category names is
 * enforced by the admin category creation API. Specifically, it verifies that
 * attempting to create two categories with the same name (even if other fields
 * differ) results in an error for the second creation and does not cause
 * duplicate records.
 *
 * Step-by-step process:
 *
 * 1. Create a category with a unique name (randomly generated, parent_id: null,
 *    is_active: true).
 * 2. Attempt to create a second category using the exact same name (other fields
 *    may differ).
 * 3. Expect the API to throw an error on the second creation.
 * 4. Do NOT validate error message or type, only that an error is thrown.
 * 5. Validation of no side effects (e.g., list or search) is skipped due to
 *    missing API exposure.
 */
export async function test_api_discussionBoard_test_fail_to_create_category_with_duplicate_name(
  connection: api.IConnection,
) {
  // 1. Create a category with a unique name
  const uniqueName: string = RandomGenerator.alphabets(12);
  const initialCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: uniqueName,
        description: RandomGenerator.paragraph()(),
        parent_id: null,
        is_active: true,
      } satisfies IDiscussionBoardCategory.ICreate,
    });
  typia.assert(initialCategory);

  // 2. Attempt to create a second category with the SAME name but different description/flag
  TestValidator.error("duplicate category name should fail")(async () => {
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: uniqueName, // duplicate name
        description: RandomGenerator.paragraph()(), // different description
        parent_id: null,
        is_active: false, // different flag (should not matter)
      } satisfies IDiscussionBoardCategory.ICreate,
    });
  });
}
