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
 * Test that a moderator can update an appeal (moderation workflow and
 * cross-role context switching).
 *
 * This test verifies that a moderator can update an appeal submitted by a
 * user, reflecting changes to its moderation status and resolution comment.
 * It covers proper role authentication, user-moderator context switching,
 * and validation of the update effect.
 *
 * Steps:
 *
 * 1. Register a moderator; authenticate as moderator to establish session.
 * 2. Register a user; authenticate as user.
 * 3. User submits a new appeal.
 * 4. Switch context back to the moderator (login as moderator).
 * 5. Moderator updates the appeal (set status, resolution comment, and
 *    resolved_at fields).
 * 6. Assert that the returned appeal is updated accordingly.
 */
export async function test_api_appeal_moderator_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate moderator
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modUsername = RandomGenerator.name();
  const modPassword = "Mod3rator!23";
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      username: modUsername,
      password: modPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });

  // 2. Register user account & authenticate as user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = "Us3r-testPa55!";
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  // User login
  const userAuth = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(userAuth);
  const userId = userAuth.user.id;

  // 3. Create an appeal as the user
  const appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: userId,
        appeal_reason: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // 4. Switch back to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 5. Moderator updates the appeal
  const now = new Date().toISOString();
  const resolutionComment = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody: IDiscussionBoardAppeal.IUpdate = {
    status: "resolved",
    resolution_comment: resolutionComment,
    resolved_at: now,
  };
  const updatedAppeal =
    await api.functional.discussionBoard.moderator.appeals.update(connection, {
      appealId: appeal.id,
      body: updateBody,
    });
  typia.assert(updatedAppeal);

  // 6. Validate
  TestValidator.equals(
    "appeal status must update to 'resolved'",
    updatedAppeal.status,
    updateBody.status,
  );
  TestValidator.equals(
    "resolution comment must match the update payload",
    updatedAppeal.resolution_comment,
    resolutionComment,
  );
  TestValidator.equals(
    "resolved_at must update to match the payload",
    updatedAppeal.resolved_at,
    now,
  );
}
