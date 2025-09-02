import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test category list retrieval with various search, filter, pagination, and
 * sorting options as an admin.
 *
 * The test authenticates an admin role and validates multiple category list
 * scenarios:
 *
 * 1. Authenticate with /auth/admin/join to obtain admin context
 * 2. Fetch all categories using empty filter/search (should return all
 *    categories)
 * 3. Filter: is_active true only, assert all results have is_active=true
 * 4. Filter: is_active false only, assert all results have is_active=false
 * 5. Partial name search: submit plausible substring, assert only categories
 *    with matching substring returned
 * 6. Pagination: fetch page 1 and 2 with limit=2, check content is disjoint,
 *    assert correct pagination data and total records
 * 7. Sorting: fetch ordered by sort_order asc/desc; fetch by name asc/desc,
 *    assert result order matches sorting
 * 8. Invalid parameters: negative/zero/oversized page/limit, assert API throws
 *    error
 * 9. Unauthenticated: attempt API call without admin login, assert access
 *    denied/error thrown
 *
 * Every step confirms response structure and business logic, including
 * correct pagination, data array lengths, content validity, and strict type
 * safety for both requests and responses.
 */
export async function test_api_admin_category_list_with_varied_filters(
  connection: api.IConnection,
) {
  // 1. Authenticate admin role
  const randomAdminUserId = typia.random<string & tags.Format<"uuid">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: randomAdminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Fetch all categories (no filters)
  const allCategories =
    await api.functional.discussionBoard.admin.categories.index(connection, {
      body: {} satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(allCategories);
  TestValidator.predicate(
    "pagination metadata present",
    !!allCategories.pagination,
  );
  TestValidator.predicate(
    "data array is array",
    Array.isArray(allCategories.data),
  );
  TestValidator.predicate(
    "data not larger than limit (if specified)",
    allCategories.data.length <=
      (allCategories.pagination?.limit ?? allCategories.data.length),
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allCategories.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= current",
    allCategories.pagination.pages >= allCategories.pagination.current,
  );

  // 3. Filter is_active=true
  const onlyActive =
    await api.functional.discussionBoard.admin.categories.index(connection, {
      body: { is_active: true } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(onlyActive);
  for (const cat of onlyActive.data)
    TestValidator.predicate("all are is_active=true", cat.is_active === true);

  // 4. Filter is_active=false
  const onlyInactive =
    await api.functional.discussionBoard.admin.categories.index(connection, {
      body: { is_active: false } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(onlyInactive);
  for (const cat of onlyInactive.data)
    TestValidator.predicate("all are is_active=false", cat.is_active === false);

  // 5. Partial name search
  let searchTerm = "";
  if (allCategories.data.length) {
    // derive substring from existing name to ensure a match
    searchTerm = RandomGenerator.substring(allCategories.data[0].name);
    const searchMatch =
      await api.functional.discussionBoard.admin.categories.index(connection, {
        body: {
          search: searchTerm,
        } satisfies IDiscussionBoardCategory.IRequest,
      });
    typia.assert(searchMatch);
    for (const cat of searchMatch.data) {
      TestValidator.predicate(
        `search term '${searchTerm}' in name`,
        cat.name.includes(searchTerm),
      );
    }
  }

  // 6. Pagination: page 1 & 2, limit=2
  const paged1 = await api.functional.discussionBoard.admin.categories.index(
    connection,
    {
      body: { page: 1, limit: 2 } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(paged1);
  const paged2 = await api.functional.discussionBoard.admin.categories.index(
    connection,
    {
      body: { page: 2, limit: 2 } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(paged2);
  TestValidator.predicate(
    "pagination current is page 1 for paged1",
    paged1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit 2 for paged1",
    paged1.pagination.limit === 2,
  );
  TestValidator.predicate(
    "pagination current is page 2 for paged2",
    paged2.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit 2 for paged2",
    paged2.pagination.limit === 2,
  );
  // Optionally: check that combined length does not exceed total records
  TestValidator.predicate(
    "paged1 + paged2 does not exceed records",
    paged1.data.length + paged2.data.length <= paged1.pagination.records,
  );
  // Can check that no category appears in both pages if dataset is large
  if (paged1.data.length && paged2.data.length) {
    const idsPage1 = new Set(paged1.data.map((x) => x.id));
    for (const c of paged2.data) {
      TestValidator.predicate("paged2 id not in paged1", !idsPage1.has(c.id));
    }
  }

  // 7. Sorting: sort_order asc/desc, name asc/desc
  const sorts: Array<["sort_order" | "name", "asc" | "desc"]> = [
    ["sort_order", "asc"],
    ["sort_order", "desc"],
    ["name", "asc"],
    ["name", "desc"],
  ];
  for (const [sort_by, dir] of sorts) {
    const sorted = await api.functional.discussionBoard.admin.categories.index(
      connection,
      {
        body: {
          sort_by,
          sort_dir: dir,
        } satisfies IDiscussionBoardCategory.IRequest,
      },
    );
    typia.assert(sorted);
    if (sorted.data.length > 1) {
      for (let i = 1; i < sorted.data.length; ++i) {
        if (dir === "asc")
          TestValidator.predicate(
            `sorted ${sort_by} asc`,
            sorted.data[i - 1][sort_by] <= sorted.data[i][sort_by],
          );
        else
          TestValidator.predicate(
            `sorted ${sort_by} desc`,
            sorted.data[i - 1][sort_by] >= sorted.data[i][sort_by],
          );
      }
    }
  }

  // 8. Error: invalid page/limit
  for (const invalid of [
    { page: 0 },
    { limit: 0 },
    { page: -1 },
    { limit: -10 },
    { page: 1_000_000 },
    { limit: 1_000_000 },
  ]) {
    await TestValidator.error("invalid pagination throws error", async () => {
      await api.functional.discussionBoard.admin.categories.index(connection, {
        body: invalid as IDiscussionBoardCategory.IRequest,
      });
    });
  }

  // 9. Error: unauthenticated access denied
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("unauthorized category list fails", async () => {
    await api.functional.discussionBoard.admin.categories.index(unauthConn, {
      body: {} satisfies IDiscussionBoardCategory.IRequest,
    });
  });
}
