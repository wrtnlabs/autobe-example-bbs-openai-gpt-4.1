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
 * Verify that a moderator can successfully access flag report details via
 * the moderator detail endpoint.
 *
 * Business scenario: A valid moderator should be able to review full
 * details of any submitted content flag report. This test covers the full
 * workflow: creating the required moderator and normal user, having the
 * user submit a flag report, then the moderator retrieving the report
 * details. Ensures proper setup, cross-role authentication, business
 * boundary enforcement, and data consistency between reported and retrieved
 * data.
 *
 * Steps:
 *
 * 1. Create a moderator account via the /auth/moderator/join endpoint (random
 *    email/username/password/consent).
 * 2. Create a regular user via /auth/user/join.
 * 3. As the user, submit a flag report (/discussionBoard/user/flagReports)
 *    with a randomly generated (but valid) postId or commentId, reason, and
 *    details.
 * 4. Switch authentication context back to the moderator (using
 *    /auth/moderator/login).
 * 5. Retrieve the flag report details as moderator using
 *    /discussionBoard/moderator/flagReports/{flagReportId}.
 * 6. Assert that all major fields (reason, details, reporterId, content ref,
 *    status, timestamps) match what was submitted and that moderator-only
 *    fields are visible.
 */
export async function test_api_flag_report_detail_access_success(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12) + "!A1"; // Satisfy password policy
  const moderatorUsername = RandomGenerator.name(2);
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorJoin);

  // 2. Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(15) + "@B2";
  const userUsername = RandomGenerator.name(2);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // 3. Switch to user session
  const userLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(userLogin);

  // 4. As user, submit flag report (using postId, random reason/details)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const reportReason = RandomGenerator.pick([
    "spam",
    "abuse",
    "misinformation",
    "other",
  ] as const);
  const reportDetails = RandomGenerator.paragraph({ sentences: 5 });
  const flagReport =
    await api.functional.discussionBoard.user.flagReports.create(connection, {
      body: {
        postId,
        reason: reportReason,
        details: reportDetails,
      } satisfies IDiscussionBoardFlagReport.ICreate,
    });
  typia.assert(flagReport);

  // 5. Switch to moderator session
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(moderatorLogin);

  // 6. Lookup report detail as moderator
  const flagReportDetail =
    await api.functional.discussionBoard.moderator.flagReports.at(connection, {
      flagReportId: flagReport.id,
    });
  typia.assert(flagReportDetail);

  // 7. Business validation: assert all details match what user submitted, and moderator can see all sensitive fields
  TestValidator.equals("report id matches", flagReportDetail.id, flagReport.id);
  TestValidator.equals("postId matches", flagReportDetail.postId, postId);
  TestValidator.equals("reason matches", flagReportDetail.reason, reportReason);
  TestValidator.equals(
    "details matches",
    flagReportDetail.details,
    reportDetails,
  );
  TestValidator.equals(
    "reporterId matches",
    flagReportDetail.reporterId,
    userJoin.user.id,
  );
  TestValidator.equals(
    "status initial 'pending'",
    flagReportDetail.status,
    "pending",
  );
  TestValidator.predicate(
    "createdAt valid ISO8601",
    typeof flagReportDetail.createdAt === "string" &&
      !isNaN(Date.parse(flagReportDetail.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt valid ISO8601",
    typeof flagReportDetail.updatedAt === "string" &&
      !isNaN(Date.parse(flagReportDetail.updatedAt)),
  );
  TestValidator.equals(
    "reviewedAt is unset for new report",
    flagReportDetail.reviewedAt,
    null,
  );
}
