import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test updating an admin discussion board category successfully and check
 * for duplicate name constraint.
 *
 * 1. Register an admin user to enable privileged operations and establish
 *    admin context (required for access to admin endpoints).
 * 2. Create two distinct discussion board categories (categoryA, categoryB)
 *    with unique names so that later we can test both update and name
 *    duplication scenarios.
 * 3. Update the first category (categoryA) success path: change name,
 *    description, is_active, sort_order. Confirm all attributes are updated
 *    as expected.
 * 4. Attempt to update categoryA with the name of categoryB. This should
 *    trigger a name-uniqueness violation (duplicate name constraint); test
 *    that this fails with an appropriate error.
 * 5. Attempt to update a category using a fabricated (random) categoryId that
 *    does not exist. It should also fail, covering the error path for
 *    missing target resources (or soft-deleted categories).
 * 6. Throughout these operations, validate all business rules, DTO type
 *    compliance, and proper error handling both for successful updates and
 *    failed validation scenarios.
 */
export async function test_api_admin_category_update_success_and_duplicate_validation(
  connection: api.IConnection,
) {
  // 1. Register an admin user (necessary for all admin category API functionality)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create two unique categories (categoryA and categoryB)
  const categoryAName: string = RandomGenerator.name();
  const categoryBName: string = categoryAName + "_dup";
  const categoryA =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: categoryAName,
        description: RandomGenerator.paragraph(),
        is_active: true,
        sort_order: 10,
      } satisfies IDiscussionBoardCategory.ICreate,
    });
  typia.assert(categoryA);
  const categoryB =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: categoryBName,
        description: RandomGenerator.paragraph(),
        is_active: true,
        sort_order: 20,
      } satisfies IDiscussionBoardCategory.ICreate,
    });
  typia.assert(categoryB);

  // 3. Update categoryA successfully - change all mutable properties
  const newName = categoryAName + "_updated";
  const newDesc = RandomGenerator.paragraph({ sentences: 3 });
  const updated = await api.functional.discussionBoard.admin.categories.update(
    connection,
    {
      categoryId: categoryA.id,
      body: {
        name: newName,
        description: newDesc,
        is_active: false,
        sort_order: 99,
      } satisfies IDiscussionBoardCategory.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("categoryA updated name", updated.name, newName);
  TestValidator.equals(
    "categoryA updated description",
    updated.description,
    newDesc,
  );
  TestValidator.equals("categoryA updated is_active", updated.is_active, false);
  TestValidator.equals("categoryA updated sort_order", updated.sort_order, 99);

  // 4. Attempt to update categoryA's name to categoryB's name (duplicate constraint)
  await TestValidator.error("duplicate category name rejected", async () => {
    await api.functional.discussionBoard.admin.categories.update(connection, {
      categoryId: categoryA.id,
      body: {
        name: categoryBName,
      } satisfies IDiscussionBoardCategory.IUpdate,
    });
  });

  // 5. Attempt to update a non-existent (random) categoryId (simulate deleted or missing)
  await TestValidator.error(
    "updating non-existent categoryId fails",
    async () => {
      await api.functional.discussionBoard.admin.categories.update(connection, {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          name: RandomGenerator.name(),
        } satisfies IDiscussionBoardCategory.IUpdate,
      });
    },
  );
}
