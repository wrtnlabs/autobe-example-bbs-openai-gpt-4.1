import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * E2E test: Moderator can access details of a user-submitted appeal by ID.
 *
 * Validates moderator authentication/session, multi-actor scenario setup,
 * permissioned access, and end-to-end creation and audit of an appeal
 * object. Checks business rule that only moderators with proper session can
 * view arbitrary appeals, while appeal creation is by standard user only.
 *
 * Steps:
 *
 * 1. Register a moderator; keep session and credentials.
 * 2. Register a standard user; keep session, user id, and credentials.
 * 3. As user, create (submit) a new appeal; extract created appeal's id and
 *    record input for later matching.
 * 4. Switch session back to moderator (login as moderator).
 * 5. Fetch the appeal as moderator with GET
 *    /discussionBoard/moderator/appeals/{appealId}.
 * 6. Assert response details match initial submission and required fields are
 *    present.
 */
export async function test_api_appeal_moderator_access_success(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modUsername = RandomGenerator.name(2);
  const modPassword = RandomGenerator.alphaNumeric(14) + "!A1";
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      username: modUsername,
      password: modPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorJoin);

  // 2. Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name(2);
  const userPassword = RandomGenerator.alphaNumeric(14) + "Aa!1";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  const userId = userJoin.user.id;

  // 3. User creates an appeal
  // Already authenticated as user, so submit appeal
  const appealReason = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const appealCreateReq = {
    appellant_id: userId,
    appeal_reason: appealReason,
  } satisfies IDiscussionBoardAppeal.ICreate;

  const createdAppeal =
    await api.functional.discussionBoard.user.appeals.create(connection, {
      body: appealCreateReq,
    });
  typia.assert(createdAppeal);
  const appealId = createdAppeal.id;

  // 4. Switch session back to moderator (login)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 5. Fetch appeal details as moderator
  const fetchedAppeal =
    await api.functional.discussionBoard.moderator.appeals.at(connection, {
      appealId: appealId,
    });
  typia.assert(fetchedAppeal);

  // 6. Assert result matches (id, appellant, reason). Ignore timestamps and system fields in deep equality
  TestValidator.equals("appeal IDs match", fetchedAppeal.id, createdAppeal.id);
  TestValidator.equals(
    "appellant_id matches",
    fetchedAppeal.appellant_id,
    appealCreateReq.appellant_id,
  );
  TestValidator.equals(
    "appeal reason matches",
    fetchedAppeal.appeal_reason,
    appealReason,
  );
}
