import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IPageIDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopics";

/**
 * Verify topic pagination in a single discussion board category.
 *
 * This test ensures that the PATCH /discussionBoard/topics endpoint returns
 * paginated result sets accurately.
 *
 * - It exercises creating enough topics to require multiple pages
 * - Then iterates through all result pages using pagination parameters, asserting
 *   correct count, no duplication, data completeness and meta accuracy.
 *
 * Business value: Guards against regression and boundary bugs in topic browsing
 * UIs for category filter/search with pagination.
 *
 * Steps:
 *
 * 1. Retrieve categories and pick an active category to use for the test
 * 2. Create more topics in the category than a single page can display (using
 *    small page size, e.g. 20, for multiple pages)
 * 3. Use PATCH /discussionBoard/topics with page, limit, and category_id, and
 *    validate returned topics and pagination meta
 * 4. Walk all result pages, accumulating all topic IDs, check page sizes and meta
 *    fields
 * 5. Validate all created topics are returned exactly once across all pages (no
 *    duplicates/loss)
 * 6. Edge case: Request page after the last; confirm .data is empty
 */
export async function test_api_discussionBoard_test_paginated_topic_search_results(
  connection: api.IConnection,
) {
  // 1. Retrieve all categories and pick one active
  const categoriesPage =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categoriesPage);
  const category = categoriesPage.data.find((cat) => cat.is_active);
  if (!category)
    throw new Error(
      "No active discussion board category found for pagination test.",
    );

  // 2. Create more topics than a single page size in the chosen category
  // Use small page size to force more pages for the test
  const pageSize = 20;
  const totalTopics = 53; // Intentionally non-divisible for last page test
  const createdTopicIds: (string & tags.Format<"uuid">)[] = [];
  // Create topics with unique titles for the test run
  for (let i = 0; i < totalTopics; ++i) {
    const title = `Pagination Test Topic #${i + 1} (${Date.now()})`;
    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title,
          description: i % 2 === 0 ? `Description for ${title}` : null,
          pinned: false,
          closed: false,
          discussion_board_category_id: category.id,
        } satisfies IDiscussionBoardTopics.ICreate,
      },
    );
    typia.assert(topic);
    createdTopicIds.push(topic.id);
  }

  // 3. Iteratively page through topics for the category
  const receivedIds: (string & tags.Format<"uuid">)[] = [];
  let totalRecords = 0;
  let totalPages = 0;
  for (let page = 1; ; ++page) {
    const res = await api.functional.discussionBoard.topics.search(connection, {
      body: {
        category_id: category.id,
        page,
        limit: pageSize,
      } satisfies IDiscussionBoardTopics.IRequest,
    });
    typia.assert(res);
    const data = res.data;
    // On first page: check meta fields
    if (page === 1) {
      totalRecords = res.pagination.records;
      totalPages = res.pagination.pages;
      TestValidator.equals("Total topics count")(totalRecords)(totalTopics);
      TestValidator.equals("Pagination pages count")(totalPages)(
        Math.ceil(totalTopics / pageSize),
      );
    }
    // Up to last page: check expected content count
    if (page < totalPages) {
      TestValidator.equals("Page filled except last")(data.length)(pageSize);
    }
    if (page === totalPages) {
      TestValidator.equals("Last page may be partial")(data.length)(
        totalTopics % pageSize || pageSize,
      );
    }
    for (const t of data) receivedIds.push(t.id);
    if (page >= totalPages) break;
  }

  // 4. Assert all topic IDs received and no duplicates/loss
  TestValidator.equals("Unique topic IDs")(new Set(receivedIds).size)(
    createdTopicIds.length,
  );
  TestValidator.equals("Received vs Created topic IDs")(new Set(receivedIds))(
    new Set(createdTopicIds),
  );

  // 5. Edge: Request beyond last page returns empty data
  const afterLastPageResp = await api.functional.discussionBoard.topics.search(
    connection,
    {
      body: {
        category_id: category.id,
        page: totalPages + 1,
        limit: pageSize,
      } satisfies IDiscussionBoardTopics.IRequest,
    },
  );
  typia.assert(afterLastPageResp);
  TestValidator.equals("Empty data after last page")(
    afterLastPageResp.data.length,
  )(0);
}
