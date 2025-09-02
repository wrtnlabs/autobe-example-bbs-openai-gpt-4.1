import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";

/**
 * Validate API enforces uniqueness constraint for user/content flag
 * reports.
 *
 * This test verifies that a user cannot submit more than one active flag
 * report for the same post or comment.
 *
 * Steps:
 *
 * 1. Register a new user with unique credentials and authenticate.
 * 2. Submit an initial flag report on a simulated post (random postId, valid
 *    reason).
 * 3. Attempt to submit a second flag report with the same user, same postId,
 *    and reason.
 * 4. Confirm that the second submission fails due to uniqueness constraint
 *    (duplicate error).
 */
export async function test_api_flag_report_create_duplicate_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate new user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "Testpass123!";
  const displayName = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Submit a first flag report (simulate postId target)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.pick([
    "spam",
    "abuse",
    "misinformation",
    "copyright",
    "off-topic",
  ] as const);
  const details = RandomGenerator.paragraph();
  const flag1 = await api.functional.discussionBoard.user.flagReports.create(
    connection,
    {
      body: {
        postId,
        reason,
        details,
      } satisfies IDiscussionBoardFlagReport.ICreate,
    },
  );
  typia.assert(flag1);

  // 3. Attempt to submit a duplicate flag report with same data
  await TestValidator.error(
    "should reject duplicate flag report on same post by same user",
    async () => {
      await api.functional.discussionBoard.user.flagReports.create(connection, {
        body: {
          postId,
          reason,
          details,
        } satisfies IDiscussionBoardFlagReport.ICreate,
      });
    },
  );
}
