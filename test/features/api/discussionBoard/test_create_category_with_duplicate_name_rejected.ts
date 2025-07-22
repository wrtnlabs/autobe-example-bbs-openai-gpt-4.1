import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validates that creating a discussion board category enforces uniqueness on the name field.
 *
 * Business context:
 * Administrators or moderators must not be able to create two categories with the same name; the backend must enforce uniqueness for organizational and navigation consistency.
 * This test confirms that when attempting to create two categories with the same name, the API properly rejects the second creation with an error indicating a uniqueness violation.
 *
 * Step-by-step process:
 * 1. Create a new discussion board category using a clearly unique name value.
 * 2. Confirm the first creation succeeds, returning a valid category object whose name matches the input.
 * 3. Attempt to create a second category using the exact same name (regardless of description content).
 * 4. Validate that the second creation fails with an error (via TestValidator.error), confirming uniqueness enforcement in the API.
 */
export async function test_api_discussionBoard_test_create_category_with_duplicate_name_rejected(
  connection: api.IConnection,
) {
  // 1. Create a discussion board category with a unique name
  const uniqueName: string = `E2E Category ${RandomGenerator.alphaNumeric(8)}`;
  const creationInput: IDiscussionBoardCategory.ICreate = {
    name: uniqueName,
    description: "Test category for duplicate name rejection.",
  };
  const createdCategory = await api.functional.discussionBoard.categories.post(connection, {
    body: creationInput,
  });
  typia.assert(createdCategory);
  TestValidator.equals("category name matches")(createdCategory.name)(uniqueName);

  // 2. Attempt to create another category with the same name
  const duplicateInput: IDiscussionBoardCategory.ICreate = {
    name: uniqueName, // identical name triggers uniqueness error
    description: "This triggers unique constraint violation.",
  };
  await TestValidator.error("should reject creation of duplicate category name")(() =>
    api.functional.discussionBoard.categories.post(connection, {
      body: duplicateInput,
    })
  );
}