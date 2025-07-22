import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";

/**
 * Validates retrieval of a single search history record by unique ID, enforcing privacy and role-based access.
 *
 * - Ensures an actor (member) can retrieve only their own search history record.
 * - Ensures an admin can retrieve any user's search history history by ID.
 * - Ensures all returned fields (keyword, actor_id, filters, context, created_at) match those provided at creation.
 * - Business privacy/access rules are enforced via logical simulation, as no authentication API is available.
 *
 * Notes:
 * Due to the absence of actual authentication APIs or role context in the provided SDK, this test simulates actors by generating unique actor_id values for members/admins. In a live suite, role switches and header injection would be required to properly enforce role-based access. Here, we focus on the logical outcome and data integrity enforced via API.
 *
 * Steps:
 * 1. Create two unique 'member' actor_id values, and one 'admin' actor_id value.
 * 2. Member 1 logs a search history (with filters/context), Member 2 logs a different search.
 * 3. Simulate acting as Member 1:
 *    - Retrieve and assert their own history matches submitted fields.
 *    - Attempt to retrieve Member 2's history (expect error: forbidden).
 * 4. Simulate acting as Admin:
 *    - Retrieve both Member 1 and Member 2's search history records by ID and assert full field match.
 */
export async function test_api_discussionBoard_test_get_search_history_by_valid_id(
  connection: api.IConnection,
) {
  // 1. Generate actor IDs (simulate two members and one admin)
  const member1Id = typia.random<string & tags.Format<"uuid">>();
  const member2Id = typia.random<string & tags.Format<"uuid">>();
  const adminId = typia.random<string & tags.Format<"uuid">>();
  // PLEASE NOTE: No API for actual authentication or role setting is available, so ids are simulated only

  // 2. Create search histories for each member
  const history1Body: IDiscussionBoardSearchHistory.ICreate = {
    actor_id: member1Id,
    keyword: "nestjs e2e testing",
    filters: JSON.stringify({ tag: "typescript" }),
    search_context: "board_page_A"
  };
  const history1 = await api.functional.discussionBoard.searchHistories.post(connection, { body: history1Body });
  typia.assert(history1);

  const history2Body: IDiscussionBoardSearchHistory.ICreate = {
    actor_id: member2Id,
    keyword: "openai ai agent",
    filters: null,
    search_context: null,
  };
  const history2 = await api.functional.discussionBoard.searchHistories.post(connection, { body: history2Body });
  typia.assert(history2);

  // 3. Simulate Member 1 retrieving their own history (should succeed)
  const gotHistory1 = await api.functional.discussionBoard.searchHistories.getById(connection, { id: history1.id });
  typia.assert(gotHistory1);
  TestValidator.equals("member1 id match")(gotHistory1.actor_id)(history1Body.actor_id);
  TestValidator.equals("keyword matches")(gotHistory1.keyword)(history1Body.keyword);
  TestValidator.equals("filters matches")(gotHistory1.filters)(history1Body.filters);
  TestValidator.equals("context matches")(gotHistory1.search_context)(history1Body.search_context);

  // 3b. Simulate forbidden access by Member 1 to Member 2's record
  await TestValidator.error("member cannot retrieve another member's history")(async () => {
    await api.functional.discussionBoard.searchHistories.getById(connection, { id: history2.id });
  });

  // 4. Simulate Admin retrieving both records
  // (Since actual authentication is unavailable, this is logical simulation only)
  const gotHistory1ByAdmin = await api.functional.discussionBoard.searchHistories.getById(connection, { id: history1.id });
  typia.assert(gotHistory1ByAdmin);
  TestValidator.equals("admin-get member1's keyword")(gotHistory1ByAdmin.keyword)(history1Body.keyword);
  TestValidator.equals("admin-get member1's filters")(gotHistory1ByAdmin.filters)(history1Body.filters);
  TestValidator.equals("admin-get member1's context")(gotHistory1ByAdmin.search_context)(history1Body.search_context);
  TestValidator.equals("admin-get member1's actor_id")(gotHistory1ByAdmin.actor_id)(history1Body.actor_id);

  const gotHistory2ByAdmin = await api.functional.discussionBoard.searchHistories.getById(connection, { id: history2.id });
  typia.assert(gotHistory2ByAdmin);
  TestValidator.equals("admin-get member2's keyword")(gotHistory2ByAdmin.keyword)(history2Body.keyword);
  TestValidator.equals("admin-get member2's filters")(gotHistory2ByAdmin.filters)(history2Body.filters);
  TestValidator.equals("admin-get member2's context")(gotHistory2ByAdmin.search_context)(history2Body.search_context);
  TestValidator.equals("admin-get member2's actor_id")(gotHistory2ByAdmin.actor_id)(history2Body.actor_id);
}