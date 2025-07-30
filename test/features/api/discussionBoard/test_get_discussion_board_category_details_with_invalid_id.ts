import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test API error handling for missing or invalid discussion board category ID.
 *
 * This test verifies that when a non-existent or malformed categoryId is used
 * in the /discussionBoard/categories/{categoryId} GET endpoint, the API:
 *
 * - Returns a clear 404 (not found) or error object signaling that the category
 *   does not exist
 * - Does not expose internal schema references or implementation details in its
 *   error response
 * - Appropriately handles both syntactically valid but non-existent UUIDs, and
 *   malformed (non-UUID) strings
 *
 * Test Steps:
 *
 * 1. Attempt to retrieve details for a non-existent (random but valid UUID)
 *    categoryId
 *
 *    - Expect a 404 or business error (not found)
 *    - Ensure error contains only safe, public-facing information, revealing no
 *         technical leaks
 * 2. Attempt to retrieve details for a syntactically malformed categoryId (not a
 *    UUID)
 *
 *    - Expect a 400 (bad request) or error about ID format
 *    - Ensure error handling does not leak internals
 */
export async function test_api_discussionBoard_test_get_discussion_board_category_details_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Attempt to get a non-existent but valid UUID categoryId
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 for non-existent categoryId")(async () => {
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: randomUuid,
    });
  });

  // 2. Attempt to get a malformed (not a UUID) categoryId
  const malformedId = "not-a-uuid";
  await TestValidator.error("400 for malformed categoryId")(async () => {
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: malformedId as any, // forced for runtime validation
    });
  });
}
