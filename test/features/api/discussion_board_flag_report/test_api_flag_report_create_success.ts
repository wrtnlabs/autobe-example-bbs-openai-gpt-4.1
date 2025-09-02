import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";

/**
 * Test successful creation of a flag report as an authenticated user.
 *
 * This test covers the workflow for a normal user flagging either a post or
 * a comment via the discussion board flag report API. It:
 *
 * - Registers a new user to obtain valid authentication
 * - Submits a new flag report against a stubbed post (using a random UUID),
 *   choosing a realistic 'reason' (e.g., 'spam') and giving a sample
 *   details string
 * - Verifies a flag report record is returned, with a unique id, correct
 *   reporterId, status 'pending', and timestamps
 * - Confirms field mapping and business invariants, such as one and only one
 *   content reference field (postId or commentId), reason propagation, and
 *   audit timestamp format
 */
export async function test_api_flag_report_create_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "Password!123";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // 2. Prepare a valid report against a stubbed post (simulate flagged content)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.pick([
    "spam",
    "abuse",
    "misinformation",
    "off-topic",
    "illegal",
    "harassment",
  ] as const);
  const details = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 10,
  });

  // 3. Submit the flag report
  const created: IDiscussionBoardFlagReport =
    await api.functional.discussionBoard.user.flagReports.create(connection, {
      body: {
        postId,
        reason,
        details,
      } satisfies IDiscussionBoardFlagReport.ICreate,
    });
  typia.assert(created);

  // 4. Validate report integrity
  TestValidator.predicate(
    "report id is UUID",
    typeof created.id === "string" &&
      /^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(created.id),
  );
  TestValidator.equals(
    "reporterId matches",
    created.reporterId,
    userJoin.user.id,
  );
  TestValidator.equals("flagged postId", created.postId, postId);
  TestValidator.equals(
    "commentId should be undefined",
    created.commentId,
    undefined,
  );
  TestValidator.equals("reason propagates", created.reason, reason);
  TestValidator.equals("details propagates", created.details, details);
  TestValidator.equals(
    "status is pending on creation",
    created.status,
    "pending",
  );
  TestValidator.predicate(
    "createdAt is ISO date",
    typeof created.createdAt === "string" &&
      !isNaN(Date.parse(created.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date",
    typeof created.updatedAt === "string" &&
      !isNaN(Date.parse(created.updatedAt)),
  );
}
