import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test retrieval of all discussion board categories with default pagination as
 * a public endpoint.
 *
 * Validates that any guest or authenticated user can access the list of
 * discussion board categories without authentication. The categories should be
 * in a flat list format, including all relevant metadata (name, description,
 * parent-child linkage, activation status, and timestamps). No special setup or
 * dependencies are needed for this endpoint.
 *
 * Steps:
 *
 * 1. Call the GET /discussionBoard/categories endpoint using a minimal connection
 *    (no auth).
 * 2. Assert the response structure (IPageIDiscussionBoardCategory) is valid using
 *    typia.assert().
 * 3. For every category, validate metadata is complete:
 *
 *    - Id is a uuid
 *    - Name is defined and non-empty
 *    - Is_active is boolean
 *    - Created_at and updated_at follow ISO8601 'date-time' format
 *    - Parent_id is either null or a valid uuid (if present)
 * 4. Verify a mix of root and nested (has parent_id) categories are present in the
 *    data (if available).
 * 5. Cross-check that active/inactive categories are properly represented, if
 *    available.
 *
 * Edge cases: If the data contains only root or only inactive categories, log a
 * warning but do not fail the test. The main requirement is correct structure
 * and visibility without authentication.
 */
export async function test_api_discussionBoard_test_list_all_discussion_board_categories_default_pagination(
  connection: api.IConnection,
) {
  // Step 1: List all categories without authentication (public endpoint)
  const output =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(output);

  // Step 2: Validate category metadata and structure
  for (const category of output.data) {
    // Check id (uuid)
    TestValidator.predicate(`category.id is uuid`)(
      typeof category.id === "string" &&
        /^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$/.test(
          category.id,
        ),
    );
    // Name exists and non-empty
    TestValidator.predicate(`category.name exists and is non-empty`)(
      typeof category.name === "string" && category.name.length > 0,
    );
    // Activation flag
    TestValidator.predicate(`category.is_active is boolean`)(
      typeof category.is_active === "boolean",
    );
    // Timestamp fields (ISO date-time)
    TestValidator.predicate(`category.created_at is ISO date-time string`)(
      typeof category.created_at === "string" &&
        !isNaN(Date.parse(category.created_at)),
    );
    TestValidator.predicate(`category.updated_at is ISO date-time string`)(
      typeof category.updated_at === "string" &&
        !isNaN(Date.parse(category.updated_at)),
    );
    // parent_id is either null, undefined, or valid uuid (if present)
    if (category.parent_id !== undefined && category.parent_id !== null)
      TestValidator.predicate(`category.parent_id is uuid (if exists)`)(
        typeof category.parent_id === "string" &&
          /^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$/.test(
            category.parent_id,
          ),
      );
  }

  // Step 3: Coverage verification for root/nested categories and activation
  const hasRoot = output.data.some(
    (cat) => cat.parent_id === null || cat.parent_id === undefined,
  );
  const hasNested = output.data.some(
    (cat) => typeof cat.parent_id === "string",
  );
  const hasInactive = output.data.some((cat) => cat.is_active === false);
  if (!hasRoot)
    console.warn(
      "[e2e] No root categories were found. Check seed data setup if needed.",
    );
  if (!hasNested)
    console.warn(
      "[e2e] No nested categories (parent_id) were found. Tree structure not covered in current data.",
    );
  if (!hasInactive)
    console.warn(
      "[e2e] No inactive categories found. Only active categories present in current data.",
    );
}
