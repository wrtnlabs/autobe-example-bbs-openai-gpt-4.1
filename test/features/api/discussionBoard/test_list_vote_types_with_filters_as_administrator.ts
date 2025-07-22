import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";
import type { IPageIDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVoteType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test retrieving a paginated and filtered list of discussion board vote types as an administrator.
 *
 * This E2E test validates the listing, searching, filtering, and pagination of vote types which define system-level voting operations (such as upvote/downvote/funny) for the discussion board system. Only an admin can access this endpoint.
 *
 * Test Steps:
 * 1. Create several distinct vote types to ensure the dataset is suitable for testing filtering and pagination.
 * 2. Retrieve all vote types using the patch endpoint. Assert created types are present and pagination reflects the number of created records.
 * 3. Filter by exact code, and partial matches on name to verify only appropriate records are returned.
 * 4. Test pagination by limiting the results (limit=2, page=1 and page=2), verify partitioning and pagination metadata.
 * 5. Query with filter values that do not match any records and validate that the result list is empty.
 */
export async function test_api_discussionBoard_test_list_vote_types_with_filters_as_administrator(
  connection: api.IConnection,
) {
  // 1. Setup - create several vote types
  const voteTypes = [
    { code: "upvote", name: "Upvote", description: "Positive endorsement" },
    { code: "downvote", name: "Downvote", description: "Negative feedback" },
    { code: "funny", name: "Funny", description: "Expresses amusement" },
  ];
  const createdTypes: { code: string; name: string; description?: string | null }[] = [];
  for (const vt of voteTypes) {
    const created = await api.functional.discussionBoard.voteTypes.post(connection, { body: vt });
    typia.assert(created);
    createdTypes.push({ code: created.code, name: created.name, description: created.description });
  }

  // 2. Retrieve all vote types - no filters
  const allResult = await api.functional.discussionBoard.voteTypes.patch(connection, { body: {} });
  typia.assert(allResult);
  const allCodes = createdTypes.map(t => t.code);
  for (const code of allCodes) {
    TestValidator.predicate(`voteType code exists: ${code}`)(
      allResult.data.some(t => t.code === code)
    );
  }
  TestValidator.predicate("total records present for created types")(
    allResult.pagination.records >= voteTypes.length
  );

  // 3. Filtering: exact code
  const exactFilter = await api.functional.discussionBoard.voteTypes.patch(connection, { body: { code: "funny" } });
  typia.assert(exactFilter);
  TestValidator.equals("filtered - only one result for code 'funny'")(exactFilter.data.length)(1);
  TestValidator.equals("filtered item code matches")(
    exactFilter.data[0].code
  )("funny");

  // 4. Partial name match filter
  const partialResult = await api.functional.discussionBoard.voteTypes.patch(connection, { body: { name: "vote" } });
  typia.assert(partialResult);
  TestValidator.predicate("all items' names contain 'vote'")(
    partialResult.data.every(t => t.name.toLowerCase().includes("vote"))
  );

  // 5. Pagination: limit 2 per page
  const page1 = await api.functional.discussionBoard.voteTypes.patch(connection, { body: { limit: 2, page: 1 } });
  typia.assert(page1);
  TestValidator.predicate("max two items on page 1")(page1.data.length <= 2);
  TestValidator.equals("pagination limit field matches")(page1.pagination.limit)(2);
  // Page 2
  const page2 = await api.functional.discussionBoard.voteTypes.patch(connection, { body: { limit: 2, page: 2 } });
  typia.assert(page2);
  TestValidator.equals("pagination reports page 2")(
    page2.pagination.current
  )(2);

  // 6. No match filter
  const noneResult = await api.functional.discussionBoard.voteTypes.patch(connection, { body: { code: "nonexistent_type" } });
  typia.assert(noneResult);
  TestValidator.equals("empty result when code doesn't exist")(noneResult.data.length)(0);
}