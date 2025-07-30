import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validate API behavior when there are no content flags in the discussion
 * board.
 *
 * This test checks that when the moderator queries for the list of content
 * flags and none exist in the system, the API returns a valid paginated
 * response with an empty `data` array and correct pagination metadata (e.g., 0
 * records). The API must not error and UX should display the empty state
 * gently.
 *
 * Steps:
 *
 * 1. Create a moderator account (dependency: only moderators can access moderation
 *    APIs).
 * 2. As a (fresh) moderator, call the content flag list API. The
 *    discussion_board_content_flags table is expected to be empty at this
 *    point.
 * 3. Assert the response structure:
 *
 *    - Response follows the IPageIDiscussionBoardContentFlag.ISummary DTO.
 *    - The `data` array is empty ([]).
 *    - Pagination metadata reflects zero records (records is 0, pages is 0, etc).
 * 4. Ensure that no error occurs and the status is HTTP 200.
 */
export async function test_api_discussionBoard_test_list_content_flags_empty_result(
  connection: api.IConnection,
) {
  // 1. Create a moderator.
  const user_identifier = typia.random<string>();
  const now = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at: now,
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 2. Query the content flag list as moderator (expecting zero flags).
  const result =
    await api.functional.discussionBoard.moderator.contentFlags.index(
      connection,
    );
  typia.assert(result);

  // 3. Assert correct empty result and pagination
  TestValidator.equals("flag data should be empty")(result.data)([]);
  TestValidator.equals("records should be zero")(result.pagination.records)(0);
  TestValidator.equals("pages should be zero or one")(result.pagination.pages)(
    0,
  );
}
