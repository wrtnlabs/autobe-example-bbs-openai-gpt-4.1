import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test detail view for a single discussion board category by admin:
 *
 * 1. Authenticate as admin (via /auth/admin/join). Establish admin
 *    authorization context.
 * 2. Create a new discussion board category as admin.
 * 3. Retrieve the created category's detail by id and validate all fields.
 * 4. Attempt to fetch details for a non-existent category id and verify error
 *    response.
 * 5. (Soft-delete / unauth tests skipped due to lack of supporting endpoints.)
 *
 * This test ensures that:
 *
 * - Admins can successfully view details for existing categories.
 * - Retrieving a non-existent category triggers proper error handling.
 * - Business rules requiring admin authentication are enforced.
 * - Test steps only use implemented endpoints & DTOs from provided materials.
 */
export async function test_api_admin_category_detail_access_and_not_found(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "admin join: user_id matches input",
    adminJoin.admin.user_id,
    adminUserId,
  );

  // 2. Create a discussion board category
  const categoryInput: IDiscussionBoardCategory.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 12,
    }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardCategory.ICreate;
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: categoryInput,
    },
  );
  typia.assert(category);
  TestValidator.equals(
    "category create: name matches",
    category.name,
    categoryInput.name,
  );
  TestValidator.equals(
    "category create: is_active matches",
    category.is_active,
    categoryInput.is_active,
  );
  TestValidator.equals(
    "category create: sort_order matches",
    category.sort_order,
    categoryInput.sort_order,
  );
  if (
    categoryInput.description !== undefined &&
    categoryInput.description !== null
  )
    TestValidator.equals(
      "category create: description matches",
      category.description,
      categoryInput.description,
    );

  // 3. Retrieve created category detail and validate
  const detail = await api.functional.discussionBoard.admin.categories.at(
    connection,
    {
      categoryId: category.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("category detail: id matches", detail.id, category.id);
  TestValidator.equals(
    "category detail: name matches",
    detail.name,
    category.name,
  );
  TestValidator.equals(
    "category detail: is_active matches",
    detail.is_active,
    category.is_active,
  );
  TestValidator.equals(
    "category detail: sort_order matches",
    detail.sort_order,
    category.sort_order,
  );
  TestValidator.equals(
    "category detail: description matches",
    detail.description,
    category.description,
  );
  TestValidator.equals(
    "category detail: created_at is string",
    typeof detail.created_at,
    "string",
  );
  TestValidator.equals(
    "category detail: updated_at is string",
    typeof detail.updated_at,
    "string",
  );

  // 4. Attempt to fetch non-existent category id (should error)
  await TestValidator.error(
    "category detail: non-existent id triggers error",
    async () => {
      await api.functional.discussionBoard.admin.categories.at(connection, {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // 5. Soft-deletion & unauth tests omitted due to lack of supporting API
}
