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
 * Test successful soft deletion (retirement) of a flag report by an
 * authorized moderator.
 *
 * This test covers a realistic business scenario involving two distinct
 * actor roles: a standard user and a moderator. It verifies that a
 * moderator is able to soft delete a user-submitted flag report, resulting
 * in a record that is no longer visible through normal review means but
 * remains for compliance/audit if such visibility APIs exist.
 *
 * Process:
 *
 * 1. Register a moderator using unique email/username/password/consent.
 *    Capture credentials for later use.
 * 2. Register a standard user with unique email/username/password/consent.
 *    Capture credentials for later use.
 * 3. Log in as the ordinary user (if not already authenticated after
 *    registration).
 * 4. As the user, create a flag report for a hypothetical post (provide postId
 *    or commentId and a reason).
 * 5. Log out user and log in as the moderator (role switch).
 * 6. As moderator, call the flag report delete (erase) API with the flag
 *    report id.
 * 7. Confirm successful call (no error/exception is thrown). Optionally, one
 *    would query normal lists and expect the flag report not to appear, but
 *    that is outside SDK coverage.
 */
export async function test_api_flag_report_soft_delete_success(
  connection: api.IConnection,
) {
  // 1. Moderator registration (join)
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modUsername = RandomGenerator.name();
  const moderatorRegRes = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      username: modUsername,
      password: "ModPassword1!",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorRegRes);

  // 2. User registration (join)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userRegRes = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: "UserPassword1!",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userRegRes);

  // 3. Log in as the user (role switch, though join already authenticates, ensure session)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "UserPassword1!",
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 4. User creates flag report
  const flagReport: IDiscussionBoardFlagReport =
    await api.functional.discussionBoard.user.flagReports.create(connection, {
      body: {
        postId: typia.random<string & tags.Format<"uuid">>(),
        // Use only postId for test coverage
        reason: RandomGenerator.pick([
          "spam",
          "abuse",
          "misinformation",
          "other",
        ]),
        details: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardFlagReport.ICreate,
    });
  typia.assert(flagReport);

  // 5. Switch to moderator (logout user, login moderator)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: "ModPassword1!",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 6. Moderator deletes (soft delete/retire) the flag report
  await api.functional.discussionBoard.moderator.flagReports.erase(connection, {
    flagReportId: flagReport.id,
  });

  // 7. There is no API to verify it is hidden from normal users, but if provided, would check the flag report is not listed normally.
}
