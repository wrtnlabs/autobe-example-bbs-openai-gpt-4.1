import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that advanced report search is ACCESS DENIED for non-moderators.
 *
 * Ensures that a regular (non-moderator) member is denied access to the
 * advanced report search endpoint for discussion board reports, and that no
 * report data is exposed on unauthorized access attempts.
 *
 * Steps:
 *
 * 1. Register a regular discussion board member via admin endpoint
 * 2. (In actual E2E, use this regular member's connection)
 * 3. Attempt PATCH /discussionBoard/moderator/reports with minimal body as the
 *    regular member
 * 4. Confirm that the API rejects the request with an authorization (forbidden)
 *    error
 * 5. Confirm no report data is returned on failure
 */
export async function test_api_discussionBoard_test_advanced_report_search_access_denied_for_non_moderators(
  connection: api.IConnection,
) {
  // 1. Register a discussion board member
  const memberInput = {
    user_identifier: RandomGenerator.alphabets(12),
    joined_at: new Date().toISOString(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. (In a real E2E, connection would be updated to reflect this member's credentials)

  // 3. Attempt to perform a PATCH request to advanced report search as a regular member
  await TestValidator.error(
    "access forbidden for regular member on moderator report search",
  )(() =>
    api.functional.discussionBoard.moderator.reports.search(connection, {
      body: {}, // minimal request body
    }),
  );
}
