import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate retrieval of discussion board category details by ID, covering both
 * root and nested categories.
 *
 * This test ensures that fetching a category using its categoryId returns the
 * correct metadata—such as name, description, parent_id (if present), is_active
 * status, and relevant timestamps (created_at, updated_at).
 *
 * Test Steps:
 *
 * 1. Create a root category (no parent) via the admin endpoint.
 * 2. Create a nested (child) category with the root category as its parent, via
 *    the admin endpoint.
 * 3. Fetch the root category by its ID using the public endpoint.
 * 4. Validate that all metadata for the root category is accurate, especially
 *    parent_id is null.
 * 5. Fetch the nested/child category by its ID using the public endpoint.
 * 6. Validate that all metadata for the nested category is accurate and the
 *    parent_id matches the root category's ID.
 * 7. Ensure the endpoint is accessible both as an unauthenticated guest and as an
 *    authenticated (admin) user (by calling after login if possible).
 */
export async function test_api_discussionBoard_test_get_discussion_board_category_details_when_category_exists(
  connection: api.IConnection,
) {
  // 1. Create a root category (no parent) via admin endpoint
  const rootCreate: IDiscussionBoardCategory.ICreate = {
    name: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph()(),
    parent_id: null,
    is_active: true,
  };
  const rootCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: rootCreate,
    });
  typia.assert(rootCategory);

  // 2. Create a nested child category with root as parent
  const childCreate: IDiscussionBoardCategory.ICreate = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph()(),
    parent_id: rootCategory.id,
    is_active: false,
  };
  const childCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: childCreate,
    });
  typia.assert(childCategory);

  // 3. Fetch the root category by its ID (as public/anyone)
  const fetchedRoot = await api.functional.discussionBoard.categories.at(
    connection,
    { categoryId: rootCategory.id },
  );
  typia.assert(fetchedRoot);
  TestValidator.equals("root id matches")(fetchedRoot.id)(rootCategory.id);
  TestValidator.equals("root name matches")(fetchedRoot.name)(rootCreate.name);
  TestValidator.equals("root description matches")(fetchedRoot.description)(
    rootCreate.description ?? null,
  );
  TestValidator.equals("root parent is null")(fetchedRoot.parent_id)(null);
  TestValidator.equals("root is_active matches")(fetchedRoot.is_active)(
    rootCreate.is_active,
  );

  // 4. Fetch the child category by its ID (as public/anyone)
  const fetchedChild = await api.functional.discussionBoard.categories.at(
    connection,
    { categoryId: childCategory.id },
  );
  typia.assert(fetchedChild);
  TestValidator.equals("child id matches")(fetchedChild.id)(childCategory.id);
  TestValidator.equals("child name matches")(fetchedChild.name)(
    childCreate.name,
  );
  TestValidator.equals("child description matches")(fetchedChild.description)(
    childCreate.description ?? null,
  );
  TestValidator.equals("child parent matches root")(fetchedChild.parent_id)(
    rootCategory.id,
  );
  TestValidator.equals("child is_active matches")(fetchedChild.is_active)(
    childCreate.is_active,
  );
}
