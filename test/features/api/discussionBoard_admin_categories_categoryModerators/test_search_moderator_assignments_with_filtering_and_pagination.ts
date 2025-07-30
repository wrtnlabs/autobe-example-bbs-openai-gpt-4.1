import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IPageIDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategoryModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test searching for moderator assignments on a category with advanced
 * filtering and pagination.
 *
 * This test verifies that an admin can use advanced filters and pagination to
 * retrieve precisely matching moderator assignments for a given category. The
 * core workflow covers:
 *
 * 1. Admin user creation (for privileged access)
 * 2. Category creation (assign target moderators to this category)
 * 3. Creation of several moderators (each with unique identities and timestamps)
 * 4. Assignment of a subset of moderators to the category, capturing assignment
 *    times
 * 5. Constructing a complex search: pick specific moderator IDs, and date range
 *    spanning only some assignments, with explicit page/limit
 * 6. Call the search API with these filters/pagination and verify:
 *
 *    - The returned list only includes assignments with correct moderators and
 *         timestamps matching the query
 *    - Pagination metadata correctly reports total pages/records/limits
 *    - Data aligns with provided filter and pagination
 */
export async function test_api_discussionBoard_admin_categories_categoryModerators_test_search_moderator_assignments_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin user creation
  const adminUserId = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const now = new Date();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminUserId,
        granted_at: now.toISOString(),
        revoked_at: null,
      },
    },
  );
  typia.assert(admin);

  // 2. Create a discussion board category
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: `Category ${RandomGenerator.alphabets(5)}`,
        is_active: true,
        description: "Test category for advanced search scenario",
        parent_id: null,
      },
    },
  );
  typia.assert(category);

  // 3. Create several moderators for later assignment
  const moderatorUsers = ArrayUtil.repeat(4)((i) => {
    return {
      user_identifier: `mod_${RandomGenerator.alphaNumeric(8)}_${i}`,
      granted_at: new Date(now.getTime() + i * 1000 * 60).toISOString(),
      revoked_at: null,
    };
  });
  const moderators = await ArrayUtil.asyncMap(moderatorUsers)(async (user) => {
    const mod = await api.functional.discussionBoard.admin.moderators.create(
      connection,
      { body: user },
    );
    typia.assert(mod);
    return mod;
  });

  // 4. Assign some moderators to the category (not all)
  const assignments = [];
  for (let i = 0; i < 3; ++i) {
    const assignment =
      await api.functional.discussionBoard.admin.categories.categoryModerators.create(
        connection,
        {
          categoryId: category.id,
          body: {
            category_id: category.id,
            moderator_id: moderators[i].id,
          },
        },
      );
    typia.assert(assignment);
    assignments.push(assignment);
  }

  // 5. Prepare advanced filter: filter by 2 moderator IDs and assignment time window spanning only 2 assignments
  const filterModerators = [
    assignments[1].moderator_id,
    assignments[2].moderator_id,
  ];
  // Assignment times are all very close--simulate filtering by most recent 2
  const createdTimes = assignments.map((a) => new Date(a.created_at).getTime());
  const minTime = Math.min(...createdTimes.slice(1)); // from assignment[1]
  const maxTime = Math.max(...createdTimes.slice(1)); // up to assignment[2]
  const created_at_start = new Date(minTime - 500).toISOString();
  const created_at_end = new Date(maxTime + 500).toISOString();

  // 6. Execute the advanced search with filter + pagination (page 1, limit 1)
  const output =
    await api.functional.discussionBoard.admin.categories.categoryModerators.search(
      connection,
      {
        categoryId: category.id,
        body: {
          category_id: category.id,
          moderator_id: filterModerators[0],
          created_at_start,
          created_at_end,
          sort: "created_at",
          order: "asc",
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(output);

  // 7. Validate results: only includes assignment matching filter, correct pagination
  TestValidator.equals("pagination: limit")(output.pagination.limit)(1);
  TestValidator.equals("pagination: current")(output.pagination.current)(1);
  TestValidator.predicate("pagination: records should be >= 1")(
    output.pagination.records >= 1,
  );
  TestValidator.equals("data length matches limit")(output.data.length)(1);
  for (const assignment of output.data) {
    TestValidator.equals("belongs to category")(assignment.category_id)(
      category.id,
    );
    TestValidator.equals("matches moderator id")(assignment.moderator_id)(
      filterModerators[0],
    );
    TestValidator.predicate("created_at in range")(
      new Date(assignment.created_at) >= new Date(created_at_start) &&
        new Date(assignment.created_at) <= new Date(created_at_end),
    );
  }
}
