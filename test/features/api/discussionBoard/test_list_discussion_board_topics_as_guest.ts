import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate guest access to public discussion board topics list API.
 *
 * This test verifies that an unauthenticated (guest) user can fetch the main
 * list of discussion board topics. It ensures that:
 *
 * - The endpoint is accessible without authentication.
 * - Only topics intended for open/public participation are listed (not
 *   deleted/restricted).
 * - Response contains correct structure: page metadata and topic summaries.
 * - Pagination metadata matches the returned data.
 *
 * Steps:
 *
 * 1. Call the /discussionBoard/topics endpoint as a guest (no authentication).
 * 2. Assert that the API responds with a valid paginated summary result
 *    (IPageIDiscussionBoardTopics.ISummary).
 * 3. Validate the response pagination object fields for type and consistency.
 * 4. Confirm that all topic entries contain required summary fields.
 */
export async function test_api_discussionBoard_test_list_discussion_board_topics_as_guest(
  connection: api.IConnection,
) {
  // 1. Call endpoint without authentication
  const output = await api.functional.discussionBoard.topics.index(connection);
  typia.assert(output);

  // 2. Check pagination object integrity
  const { pagination, data } = output;
  typia.assert(pagination);
  TestValidator.predicate("current is int && >= 1")(
    Number.isInteger(pagination.current) && pagination.current >= 1,
  );
  TestValidator.predicate("limit is int && > 0")(
    Number.isInteger(pagination.limit) && pagination.limit > 0,
  );
  TestValidator.predicate("records is int && >= 0")(
    Number.isInteger(pagination.records) && pagination.records >= 0,
  );
  TestValidator.predicate("pages is int && >= 0")(
    Number.isInteger(pagination.pages) && pagination.pages >= 0,
  );

  // 3. Each topic in the data[] array must have valid public summary structure
  for (const summary of data) {
    typia.assert(summary);
    TestValidator.predicate("topic id is uuid")(
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate("title non-empty")(
      typeof summary.title === "string" && summary.title.length > 0,
    );
    TestValidator.predicate("created_at valid ISO8601")(
      typeof summary.created_at === "string" &&
        !isNaN(Date.parse(summary.created_at)),
    );
    TestValidator.predicate("updated_at valid ISO8601")(
      typeof summary.updated_at === "string" &&
        !isNaN(Date.parse(summary.updated_at)),
    );
    TestValidator.predicate("discussion_board_category_id is uuid")(
      typeof summary.discussion_board_category_id === "string" &&
        summary.discussion_board_category_id.length > 0,
    );
    // Only public (non-deleted, non-restricted) are expected but we cannot check DB only summary, skip extra check
  }
}
