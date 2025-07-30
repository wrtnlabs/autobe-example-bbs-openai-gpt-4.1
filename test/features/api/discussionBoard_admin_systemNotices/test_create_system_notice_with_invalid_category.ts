import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * Validate failure on creating a system notice with invalid category reference.
 *
 * This test verifies that when an admin attempts to create a system notice
 * (global or category-scoped announcement) with a category_id that does not
 * exist, the API correctly rejects the request and produces an error.
 *
 * Test Flow:
 *
 * 1. Attempt to create a system notice with a non-existent (random) category_id
 *    (valid format UUID but no such category exists).
 * 2. Expect the API to return an error (e.g., 400/404) indicating invalid
 *    category.
 * 3. Ensure no system notice is created as a result (no valid notice object
 *    returned).
 */
export async function test_api_discussionBoard_admin_systemNotices_create_with_invalid_category(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for non-existent category_id
  const invalidCategoryId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Build the notice creation input with the invalid category
  const noticeInput: IDiscussionBoardSystemNotice.ICreate = {
    category_id: invalidCategoryId, // Deliberate invalid reference
    title: "Test Invalid Category",
    body: "This notice should not succeed.",
    is_active: true,
    // start_at, end_at can be omitted (optional)
  };

  // 3. Attempt to create the notice and assert that it fails
  await TestValidator.error("should fail for invalid category_id")(async () => {
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: noticeInput,
      },
    );
  });
}
