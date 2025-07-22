import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E Test: Filter and paginate discussion board tags by keyword
 *
 * This test validates the ability to search and paginate tags in the discussion board system,
 * simulating a user browsing/filtering tags using keyword and paging via PATCH /discussionBoard/tags.
 *
 * Business value: Ensures that filtering and pagination logic for tag browsing works as expected,
 * returning only relevant tags and correct paging information for UI consumers. Covers realistic
 * user workflow for discoverability and content filtering.
 *
 * Step-by-step process:
 * 1. Create a known set of tags ('alpha', 'alphabet', 'beta', 'alphonse', 'gamma', 'delta')
 * 2. Search for tags with name filter 'alph' (should match alpha, alphabet, alphonse)
 * 3. Request page 1 with limit 2 – verify only two results, but total/records are correct
 * 4. All returned tag names must contain the filter text
 * 5. Check pagination.page and total pages match expectation
 * 6. Query with a page beyond total pages – should return no results (edge case)
 */
export async function test_api_discussionBoard_test_search_tags_with_keyword_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create known tags for the filtering scenario
  const tagsToCreate = [
    { name: "alpha" },
    { name: "alphabet" },
    { name: "beta" },
    { name: "alphonse" },
    { name: "gamma" },
    { name: "delta" },
  ];
  const createdTags: IDiscussionBoardTag[] = [];
  for (const t of tagsToCreate) {
    const tag = await api.functional.discussionBoard.tags.post(connection, {
      body: {
        name: t.name,
        description: `${t.name.charAt(0).toUpperCase()}${t.name.slice(1)} tag`,
      } satisfies IDiscussionBoardTag.ICreate,
    });
    typia.assert(tag);
    createdTags.push(tag);
  }

  // 2. Search for tags by a partial name ('alph'), page 1, limit 2
  const keyword = "alph";
  const limit = 2;
  const page = 1;
  const filterResp = await api.functional.discussionBoard.tags.patch(connection, {
    body: {
      name: keyword,
      limit,
      page,
    } satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(filterResp);

  // 3. Calculate reference set for filtered results
  const expected = createdTags.filter((t) => t.name.includes(keyword));
  TestValidator.equals("filtered tag records count")(filterResp.pagination.records)(expected.length);
  filterResp.data.forEach((t) => {
    TestValidator.predicate(`tag name contains '${keyword}'`)(t.name.includes(keyword));
  });

  // 4. Validate number of results on this page, and correct total page calculation
  TestValidator.equals("tags returned in page")(filterResp.data.length)(Math.min(limit, expected.length));
  const totalPages = Math.ceil(expected.length / limit);
  TestValidator.equals("total pagination pages")(filterResp.pagination.pages)(totalPages);

  // 5. Edge case: request a page beyond the last – it should return no results
  const overflowResp = await api.functional.discussionBoard.tags.patch(connection, {
    body: {
      name: keyword,
      limit,
      page: totalPages + 1,
    } satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(overflowResp);
  TestValidator.equals("no tags on out-of-bounds page")(overflowResp.data.length)(0);
}