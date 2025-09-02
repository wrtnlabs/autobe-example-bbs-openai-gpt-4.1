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
 * End-to-end test of moderator's ability to update status and notes for a
 * flag report.
 *
 * This scenario covers the multi-actor flow for moderation of user reports:
 *
 * 1. Register a moderator (unique credentials)
 * 2. Register a user (unique credentials)
 * 3. Log in as user (if needed for session)
 * 4. User submits a new flag report (flagging a random post or comment)
 * 5. Switch authentication context to moderator (log in)
 * 6. Moderator updates flag report status to "accepted" and adds details/notes
 *    (with reviewedAt)
 * 7. Assert updated status/details/reviewedAt, plus verify immutable fields
 *    (e.g., reporterId) are unchanged
 * 8. Assert updatedAt has advanced
 */
export async function test_api_flag_report_update_status_success(
  connection: api.IConnection,
) {
  // 1. Register (join) a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorUsername = RandomGenerator.name();
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorJoin);
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(moderatorLogin);

  // 2. Register (join) a normal user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(14);
  const userUsername = RandomGenerator.name();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // 3. Log in as user (reset context to standard user)
  const userLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(userLogin);

  // 4. User creates a flag report (randomized postId)
  const targetPostId = typia.random<string & tags.Format<"uuid">>();
  const reportReason = RandomGenerator.pick([
    "spam",
    "abuse",
    "misinformation",
    "harassment",
  ] as const);
  const reportDetails = RandomGenerator.paragraph({ sentences: 2 });
  const reportCreate =
    await api.functional.discussionBoard.user.flagReports.create(connection, {
      body: {
        postId: targetPostId,
        reason: reportReason,
        details: reportDetails,
      } satisfies IDiscussionBoardFlagReport.ICreate,
    });
  typia.assert(reportCreate);
  const reportId = reportCreate.id;

  // Capture immutable fields for later
  const originalReporterId = reportCreate.reporterId;
  const originalReason = reportCreate.reason;
  const originalPostId = reportCreate.postId;
  const originalCommentId = reportCreate.commentId ?? null;
  const originalCreatedAt = reportCreate.createdAt;
  const originalUpdatedAt = reportCreate.updatedAt;

  // 5. Switch context: log in as moderator
  const reloginModerator = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(reloginModerator);

  // 6. Moderator updates flag report status/details
  const moderationNotes = RandomGenerator.paragraph({ sentences: 3 });
  const newStatus = RandomGenerator.pick(["accepted", "dismissed"] as const);
  const nowIso = new Date().toISOString();
  const updateResult =
    await api.functional.discussionBoard.moderator.flagReports.update(
      connection,
      {
        flagReportId: reportId,
        body: {
          status: newStatus,
          details: moderationNotes,
          reviewedAt: nowIso,
        } satisfies IDiscussionBoardFlagReport.IUpdate,
      },
    );
  typia.assert(updateResult);

  // 7. Assertions
  TestValidator.equals(
    "moderator update sets status",
    updateResult.status,
    newStatus,
  );
  TestValidator.equals(
    "moderator update sets notes/details",
    updateResult.details,
    moderationNotes,
  );
  TestValidator.predicate(
    "reviewedAt is present after moderation",
    typeof updateResult.reviewedAt === "string" &&
      updateResult.reviewedAt.length > 0,
  );
  TestValidator.predicate(
    "reviewedAt matches or exceeds update timestamp",
    Date.parse(updateResult.reviewedAt ?? "") >= Date.parse(nowIso),
  );
  TestValidator.equals(
    "reporter remains unchanged",
    updateResult.reporterId,
    originalReporterId,
  );
  TestValidator.equals(
    "report reason unchanged",
    updateResult.reason,
    originalReason,
  );
  TestValidator.equals(
    "report postId unchanged",
    updateResult.postId,
    originalPostId,
  );
  TestValidator.equals(
    "report commentId unchanged",
    updateResult.commentId ?? null,
    originalCommentId,
  );
  TestValidator.predicate(
    "updatedAt field is newer after update",
    Date.parse(updateResult.updatedAt) > Date.parse(originalUpdatedAt),
  );
}
