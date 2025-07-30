import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Verify that updating a discussion board category fails for non-admin users.
 *
 * This test ensures strict enforcement of admin-only permissions when
 * attempting to modify core schema elements via the category update API.
 * Specifically, it confirms that users lacking administrator rights cannot
 * update a category and will receive a permission error rather than a
 * successful update response. This prevents privilege escalation attacks or
 * accidental schema changes by unauthorized users.
 *
 * Test Steps:
 *
 * 1. (Precondition) As an admin, create a discussion board category via the admin
 *    category creation endpoint. Store the resulting category ID as the target
 *    for the update attempt.
 * 2. Simulate the authentication context of a non-admin user. (Assume that the
 *    test runner uses the provided `connection` object, which lacks admin
 *    privilege for this test.)
 * 3. Attempt to update the existing category using the update endpoint and an
 *    arbitrary update payload while authenticated as a non-admin user.
 * 4. Expect a permission error (access denied) from the API. Use
 *    TestValidator.error() to assert that the update is strictly rejected.
 */
export async function test_api_discussionBoard_test_fail_to_update_category_when_user_is_not_admin(
  connection: api.IConnection,
) {
  // 1. Create a category as admin for targeting
  const createdCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        is_active: true,
      } satisfies IDiscussionBoardCategory.ICreate,
    });
  typia.assert(createdCategory);

  // 2. Assume connection is for a non-admin (permission insufficient)
  // 3. Attempt to update as non-admin
  await TestValidator.error("update is forbidden for non-admin")(async () => {
    await api.functional.discussionBoard.admin.categories.update(connection, {
      categoryId: createdCategory.id,
      body: {
        name: RandomGenerator.alphabets(15),
        is_active: false,
      } satisfies IDiscussionBoardCategory.IUpdate,
    });
  });
}
