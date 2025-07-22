import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";

/**
 * Test creation of a search history record with valid input data.
 *
 * This test ensures that a valid discussion board member can create a search history record using all allowed fields, and that the returned object properly reflects the submission (with a unique id and accurate timestamp fields).
 *
 * Steps:
 * 1. Create a valid discussion board member; capture their uuid for use as the search actor.
 * 2. Prepare a search history creation request using the member’s uuid, a realistic keyword, example filters (as a string), and a realistic search context.
 * 3. Call the search history creation endpoint.
 * 4. Validate that the API response structure matches the output type, especially that all fields are present and correct (input fields match, id/timestamp fields are set, optional fields are accepted).
 * 5. Assert correctness of id, created_at, and that all input values were stored exactly.
 */
export async function test_api_discussionBoard_test_create_search_history_with_valid_data(connection: api.IConnection) {
  // 1. Create a valid discussion board member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    profile_image_url: RandomGenerator.pick([
      null,
      typia.random<string & tags.Format<"uri">>(),
    ]),
  };
  const member = await api.functional.discussionBoard.members.post(connection, { body: memberInput });
  typia.assert(member);

  // 2. Prepare a valid search history create payload
  const searchHistoryCreate: IDiscussionBoardSearchHistory.ICreate = {
    actor_id: member.id,
    keyword: RandomGenerator.alphaNumeric(12),
    filters: JSON.stringify({ tags: ["news", "test"], dateRange: { from: "2023-01-01", to: "2023-12-31" } }),
    search_context: "board_homepage",
  };

  // 3. Call the create endpoint
  const output = await api.functional.discussionBoard.searchHistories.post(connection, { body: searchHistoryCreate });
  typia.assert(output);

  // 4. Validate that the response matches expectations
  TestValidator.equals("actor_id should match input")(output.actor_id)(searchHistoryCreate.actor_id);
  TestValidator.equals("keyword should match input")(output.keyword)(searchHistoryCreate.keyword);
  TestValidator.equals("filters should match input")(output.filters)(searchHistoryCreate.filters);
  TestValidator.equals("search_context should match input")(output.search_context)(searchHistoryCreate.search_context);

  // 5. Assert id and created_at are set and correctly formatted
  TestValidator.predicate("id should be a non-empty uuid")(!!output.id && output.id.length === 36 && output.id.includes("-"));
  TestValidator.predicate("created_at is in ISO 8601 format")(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:.+/.test(output.created_at));
}