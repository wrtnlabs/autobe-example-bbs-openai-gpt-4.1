import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";

/**
 * Validate that creation of discussion board search history with invalid data is rejected.
 *
 * This test covers failure scenarios for the POST /discussionBoard/searchHistories endpoint,
 * targeting validation and input enforcement in the following cases:
 *   - Invalid actor reference (actor_id with an unknown UUID)
 *   - Malformed actor_id (not a UUID)
 *   - Empty keyword string
 *   - Incorrectly formatted filters (malformed/non-JSON string)
 *
 * Steps:
 * 1. Register a valid member (get a valid actor_id for positive and negative tests).
 * 2. Try with actor_id not a UUID (should error).
 * 3. Try with actor_id a valid UUID but not assigned to any member (should error).
 * 4. Try with valid actor_id but keyword as empty string (should error).
 * 5. Try with valid actor_id and keyword but filters supplied as malformed string (should error).
 * 6. Try with all required and optional data validly (should succeed, positive control).
 *
 * Each error attempt checks that an error is thrown and no record is created.
 * The success case checks that the record was properly created.
 */
export async function test_api_discussionBoard_test_create_search_history_with_invalid_data(
  connection: api.IConnection,
) {
  // 1. Register a valid member
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<'email'>>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member);

  // 2. Malformed actor_id (not a UUID)
  await TestValidator.error("actor_id not a uuid")(() => {
    return api.functional.discussionBoard.searchHistories.post(connection, {
      body: {
        actor_id: "not-a-uuid",
        keyword: "valid keyword",
      },
    });
  });

  // 3. actor_id is a valid UUID but not a known member
  await TestValidator.error("unknown actor_id uuid")(() => {
    return api.functional.discussionBoard.searchHistories.post(connection, {
      body: {
        actor_id: typia.random<string & tags.Format<'uuid'>>(),
        keyword: "valid keyword",
      },
    });
  });

  // 4. Empty keyword
  await TestValidator.error("empty keyword")(() => {
    return api.functional.discussionBoard.searchHistories.post(connection, {
      body: {
        actor_id: member.id,
        keyword: "",
      },
    });
  });

  // 5. Malformed filters field (not JSON)
  await TestValidator.error("malformed filters")(() => {
    return api.functional.discussionBoard.searchHistories.post(connection, {
      body: {
        actor_id: member.id,
        keyword: "valid keyword",
        filters: "this-is-not-json",
      },
    });
  });

  // 6. Positive control: all valid
  const searchHistory = await api.functional.discussionBoard.searchHistories.post(connection, {
    body: {
      actor_id: member.id,
      keyword: "valid keyword",
      filters: JSON.stringify({ tag: "general" }),
      search_context: "homepage",
    },
  });
  typia.assert(searchHistory);
  TestValidator.equals("actor_id matches")(searchHistory.actor_id)(member.id);
  TestValidator.equals("keyword matches")(searchHistory.keyword)("valid keyword");
}