import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test creation of a new discussion board category as admin, including
 * duplicate name validation.
 *
 * This test enforces both the admin privilege requirement and the business
 * rule that category names must be unique:
 *
 * 1. Registers an admin using /auth/admin/join (creates an admin and
 *    authenticates this session as admin).
 * 2. As admin, creates a new discussion board category with a unique
 *    randomized name, description, is_active flag, and sort_order. Confirms
 *    the created entity's returned values match the input.
 * 3. Attempts to create a second category with the same name using the admin
 *    session; expects a validation/business error for violating name
 *    uniqueness. The error is captured and asserted as intended business
 *    rule enforcement.
 *
 * These tests ensure correct uniqueness enforcement for category creation
 * and proper privilege guardrails for admin endpoints.
 */
export async function test_api_admin_category_create_success_and_duplicate_name(
  connection: api.IConnection,
) {
  // 1. Register an admin (establish admin authentication context)
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminResponse = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminResponse);
  TestValidator.predicate(
    "admin registration should yield active admin",
    adminResponse.admin.is_active,
  );

  // 2. Create a unique discussion board category as admin
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 10,
  });
  const categoryInput: IDiscussionBoardCategory.ICreate = {
    name: categoryName,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    is_active: true,
    sort_order: 1,
  };
  const createdCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: categoryInput,
    });
  typia.assert(createdCategory);
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryInput.name,
  );
  TestValidator.equals(
    "category description matches",
    createdCategory.description,
    categoryInput.description,
  );
  TestValidator.equals(
    "category active status matches",
    createdCategory.is_active,
    categoryInput.is_active,
  );
  TestValidator.equals(
    "category sort order matches",
    createdCategory.sort_order,
    categoryInput.sort_order,
  );

  // 3. Attempt to create another category with the same name (should fail due to uniqueness)
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: { ...categoryInput },
    });
  });
}
