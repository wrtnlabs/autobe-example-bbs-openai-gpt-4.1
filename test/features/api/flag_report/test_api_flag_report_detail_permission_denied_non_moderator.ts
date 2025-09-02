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
 * Validate access control for moderator-only flag report details.
 *
 * This test ensures that a standard (non-moderator) user cannot access the
 * detailed information of a discussion board flag report intended ONLY for
 * moderators. It checks that role-based permissions are enforced by the
 * API.
 *
 * Process steps:
 *
 * 1. Register and authenticate a standard user (IDiscussionBoardUser.ICreate)
 * 2. Attempt, as this user, to access the moderator-restricted endpoint (GET
 *    /discussionBoard/moderator/flagReports/{flagReportId}) using a random
 *    UUID
 * 3. Verify that the API denies access with an error (forbidden/unauthorized),
 *    proving that non-moderators are prevented from accessing sensitive
 *    flag report info
 */
export async function test_api_flag_report_detail_permission_denied_non_moderator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a standard (non-moderator) user
  const userSignupInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12) + ".A1!",
    display_name: RandomGenerator.name(),
    consent: true,
  };
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: userSignupInput,
  });
  typia.assert(authorizedUser);

  // 2. Attempt to access the moderator-only flag report detail endpoint as this user
  const randomFlagReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-moderator should be denied access to flag report detail endpoint",
    async () => {
      await api.functional.discussionBoard.moderator.flagReports.at(
        connection,
        {
          flagReportId: randomFlagReportId,
        },
      );
    },
  );
}
