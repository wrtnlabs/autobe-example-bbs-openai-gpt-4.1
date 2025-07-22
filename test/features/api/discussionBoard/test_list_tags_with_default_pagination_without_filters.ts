import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test retrieving a paginated list of all discussion board tags without filters.
 *
 * This test ensures that the tag listing endpoint returns correct results and pagination metadata
 * when no filters are supplied (default/null search parameters). The test creates more tags than the
 * default page size (assume 20 tags if the default page size is 10) to guarantee paging occurs, then
 * fetches the first page. The test confirms the correct number of tags are returned (should match default limit),
 * that pagination metadata reflects the presence of further pages, and that sensitive tag details are not unintentionally exposed.
 *
 * Step-by-step:
 * 1. Create at least 20 tags using the tag creation API (so that there are more tags than the page size).
 * 2. Call the tag listing API (PATCH /discussionBoard/tags) with no filters or paging supplied (default/null request).
 * 3. Assert:
 *    a. Result contains non-zero data (should return at least 1, up to default limit, e.g. 10).
 *    b. Pagination metadata total records >= tags created.
 *    c. Pagination page `current` is 1, and `limit` matches default (e.g. 10).
 *    d. Returned tags are among the tags created (by id or name).
 *    e. No sensitive details are present in the response objects (only expected fields).
 */
export async function test_api_discussionBoard_test_list_tags_with_default_pagination_without_filters(connection: api.IConnection) {
  // Step 1: Create at least 20 tags with unique names
  const tagsCreated = await ArrayUtil.asyncRepeat(20)(async (i) => {
    const tagName = `e2e-tag-default-${i}-${RandomGenerator.alphaNumeric(6)}`;
    const created = await api.functional.discussionBoard.tags.post(connection, {
      body: {
        name: tagName,
        description: `Auto-generated tag for E2E default paging test #${i}`,
      } satisfies IDiscussionBoardTag.ICreate,
    });
    typia.assert(created);
    return created;
  });

  // Step 2: Fetch first page of tags with no filters or pagination supplied (defaults)
  const result = await api.functional.discussionBoard.tags.patch(connection, {
    body: {} satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(result);

  // Step 3a: Assert data array has at least 1 tag, does not exceed default page size
  TestValidator.predicate("tag data returned has at least 1 item")(result.data.length > 0);
  TestValidator.predicate("tag data does not exceed default page size (limit) supplied by pagination.limit")(result.data.length <= result.pagination.limit);

  // Step 3b: Assert pagination total records includes at least the number we created
  TestValidator.predicate("pagination total records includes our created tags")(result.pagination.records >= tagsCreated.length);

  // Step 3c: Assert current page is 1
  TestValidator.equals("current page is 1")(result.pagination.current)(1);

  // Step 3d: Returned tags are among created tags (by id)
  const createdIds = tagsCreated.map((t) => t.id);
  TestValidator.predicate("at least one returned tag is among those created")(
    result.data.some((tag) => createdIds.includes(tag.id))
  );

  // Step 3e: Validate surface of tag objects for privacy compliance
  for (const tag of result.data) {
    const allowedKeys = ["id", "name", "description", "created_at", "updated_at", "deleted_at"];
    TestValidator.predicate("tag object only contains allowed fields")(
      Object.keys(tag).every((k) => allowedKeys.includes(k))
    );
  }
}