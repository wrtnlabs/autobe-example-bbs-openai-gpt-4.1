import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate searching for discussion board tags returns correct results when no match is found.
 *
 * This test ensures that when a user attempts to search for tags with a keyword that doesn't exist in any tag's name, the system returns an empty result set with valid pagination metadata (page, limit, records, pages). 
 * Before searching, a baseline set of tags is created that intentionally do not include the negative search keyword. The test then uses PATCH /discussionBoard/tags with the non-existent keyword. The response should have an empty data array, and pagination info should remain consistent and valid (e.g., records=0, pages=0).
 *
 * Steps:
 * 1. Create a baseline set of unique tags using POST /discussionBoard/tags (none of which contain the negative keyword).
 * 2. Search for tags using PATCH /discussionBoard/tags with a unique keyword not present in any tag.
 * 3. Assert that the response data array is empty.
 * 4. Assert that pagination metadata is valid and reflects the absence of records.
 */
export async function test_api_discussionBoard_test_search_tags_with_no_results_returned(
  connection: api.IConnection,
) {
  // 1. Create baseline tags that do NOT contain the negative keyword
  const tagNames = [
    RandomGenerator.alphabets(8),
    RandomGenerator.alphabets(10),
    RandomGenerator.alphabets(7),
  ];
  const tagDescs = [
    RandomGenerator.paragraph()(),
    RandomGenerator.paragraph()(),
    RandomGenerator.paragraph()(),
  ];
  const baselineTags = await Promise.all(
    tagNames.map((name, idx) =>
      api.functional.discussionBoard.tags.post(connection, {
        body: {
          name,
          description: tagDescs[idx],
        } satisfies IDiscussionBoardTag.ICreate,
      })
    )
  );
  baselineTags.forEach(tag => typia.assert(tag));

  // 2. Pick a unique search keyword that is not in baseline tags
  const negativeKeyword = "__no_matching_tag__" + RandomGenerator.alphabets(10);
  if (tagNames.some((n) => n.includes(negativeKeyword)))
    throw new Error("Negative keyword accidentally collides with existing tag!");

  // 3. Search using the negative keyword
  const response = await api.functional.discussionBoard.tags.patch(connection, {
    body: {
      name: negativeKeyword,
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(response);

  // 4. Assert data array is empty
  TestValidator.equals("should have no data in search result")(response.data)([]);

  // 5. Assert pagination metadata is correct
  TestValidator.equals("record count is zero")(response.pagination.records)(0);
  TestValidator.equals("page is 1")(response.pagination.current)(1);
  TestValidator.equals("limit is respected")(response.pagination.limit)(10);
  TestValidator.equals("pages is zero")(response.pagination.pages)(0);
}