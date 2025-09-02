import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Ensure moderator-only flag report deletion API returns permission error
 * for regular user.
 *
 * Verifies that a standard (non-moderator) user is blocked from using the
 * /discussionBoard/moderator/flagReports/{flagReportId} DELETE endpoint.
 * The test simulates normal user account registration, attempts to call the
 * privileged endpoint, and confirms the system returns a
 * forbidden/unauthorized error. This test is essential for validating the
 * access control system's proper enforcement of RBAC isolation between
 * standard users and moderators for critical moderation operations.
 *
 * Steps:
 *
 * 1. Register a regular user and obtain authentication.
 * 2. Attempt to delete a flag report as regular user via moderator-only
 *    endpoint, using a random UUID.
 * 3. Check for error: the call must fail with forbidden/unauthorized status
 *    (HTTP 403/401), proving RBAC is enforced.
 * 4. No test data cleanup needed, as nothing should be mutated.
 */
export async function test_api_flag_report_soft_delete_permission_denied_non_moderator(
  connection: api.IConnection,
) {
  // 1. Register a regular (non-moderator) user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: "SecurePassw0rd!",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // 2. Attempt to delete a flag report as regular user – should fail
  const randomFlagReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "regular user cannot perform moderator-only flag report deletion",
    async () => {
      await api.functional.discussionBoard.moderator.flagReports.erase(
        connection,
        {
          flagReportId: randomFlagReportId,
        },
      );
    },
  );
}
