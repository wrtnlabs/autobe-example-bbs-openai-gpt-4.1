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
 * Test advanced topic search in discussion board with category and pinned
 * status filter.
 *
 * Verifies:
 *
 * 1. That filtering topics by a real category and `pinned=true` returns only
 *    pinned topics in that category (positive filter case).
 * 2. That searching for pinned topics in a non-existent category UUID returns no
 *    topics (negative filter case).
 *
 * Workflow:
 *
 * 1. Retrieve current discussion board categories.
 * 2. Pick one category and create a pinned topic within it for search validation.
 * 3. Call PATCH /discussionBoard/topics with category_id and pinned=true - check
 *    only pinned topics in that category are returned, and our created topic
 *    appears in the result.
 * 4. Generate a random UUID, search by that as category_id (pinned=true), and
 *    assert the result set is empty.
 */
export async function test_api_discussionBoard_test_search_topics_with_category_and_pinned_filter(
  connection: api.IConnection,
) {
  // 1. Retrieve available discussion board categories (required for test)
  const categories =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categories);
  TestValidator.predicate("at least one category must exist")(
    categories.data.length >= 1,
  );

  // 2. Randomly select a real category to test filtering
  const category = RandomGenerator.pick(categories.data);

  // 3. Create a pinned topic in that category (ensuring there is at least one pinned topic)
  const uniqueTitle = `Pinned Test Topic - ${typia.random<string & tags.Format<"uuid">>()}`;
  const created = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: uniqueTitle,
        description: RandomGenerator.paragraph()(),
        pinned: true,
        closed: false,
        discussion_board_category_id: category.id,
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(created);

  // 4. Search with advanced filter: topics in category where pinned=true
  const searchResult = await api.functional.discussionBoard.topics.search(
    connection,
    {
      body: {
        category_id: category.id,
        pinned: true,
      } satisfies IDiscussionBoardTopics.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search result includes at least one pinned topic in category",
  )(searchResult.data.length >= 1);
  {
    // Confirm all results match the filter conditions, and our created topic is present
    let foundCreated = false;
    for (const summary of searchResult.data) {
      TestValidator.equals("topic category matches filter")(
        summary.discussion_board_category_id,
      )(category.id);
      TestValidator.equals("pinned flag matches filter")(summary.pinned)(true);
      if (summary.title === uniqueTitle && summary.id === created.id)
        foundCreated = true;
    }
    TestValidator.predicate("created pinned topic appears in result")(
      foundCreated,
    );
  }

  // 5. Negative test: search for pinned topics in a non-existent category
  const fakeCategoryId = typia.random<string & tags.Format<"uuid">>();
  const negativeResult = await api.functional.discussionBoard.topics.search(
    connection,
    {
      body: {
        category_id: fakeCategoryId,
        pinned: true,
      } satisfies IDiscussionBoardTopics.IRequest,
    },
  );
  typia.assert(negativeResult);
  TestValidator.equals("no topics should be found in fake category")(
    negativeResult.data.length,
  )(0);
}
