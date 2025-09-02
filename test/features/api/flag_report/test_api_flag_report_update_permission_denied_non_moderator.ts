import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";

/**
 * Ensures non-moderators are denied permission to update any flag report
 * via moderator API.
 *
 * This test verifies backend enforcement of role-based access controls. It
 * first registers a standard user and then attempts to update a flag report
 * using the moderator-only API. The test must assert that access is denied
 * with a forbidden or unauthorized error. Scenario helps ensure
 * non-moderators cannot escalate privileges to moderate reports.
 *
 * Steps:
 *
 * 1. Register a standard discussion board user (non-moderator).
 * 2. Attempt to update a flag report with the standard user's session.
 * 3. Assert that an error (forbidden/unauthorized) is thrown when accessing
 *    moderator endpoint.
 */
export async function test_api_flag_report_update_permission_denied_non_moderator(
  connection: api.IConnection,
) {
  // 1. Register a standard user
  const userReg = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "!A1",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userReg);

  // 2. Generate plausible flagReportId and update body (valid input, invalid role)
  const fakeFlagReportId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    status: "triaged",
  } satisfies IDiscussionBoardFlagReport.IUpdate;

  // 3. Assert forbidden or unauthorized error when calling moderator endpoint
  await TestValidator.error(
    "Non-moderator cannot update flag reports via moderator endpoint",
    async () => {
      await api.functional.discussionBoard.moderator.flagReports.update(
        connection,
        {
          flagReportId: fakeFlagReportId,
          body: updateBody,
        },
      );
    },
  );
}
