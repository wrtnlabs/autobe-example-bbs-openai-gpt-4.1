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
 * Validate that an unauthorized moderator (not assigned or no permission
 * for appeal target) cannot update appeals they should not have access to.
 *
 * Business context: Discussion board appeals are reviewed and processed by
 * moderators. To protect the integrity of appeal processes and avoid
 * unauthorized modifications, only moderators with appropriate
 * assignments/privileges should be able to update appeals. Moderators who
 * are not eligible must receive a forbidden (permission denied) error.
 *
 * Step-by-step process:
 *
 * 1. Register mod1 via API (establishes a valid moderator account).
 * 2. Register an end user who will submit an appeal.
 * 3. Log in as the user (to acquire correct session), and file a new appeal.
 * 4. Register a second moderator (mod2) in the system.
 * 5. Log in as mod2 (session switch): mod2 has no assignment/privilege over
 *    the user's appeal.
 * 6. As mod2, attempt to update the appeal (should fail).
 * 7. Confirm that the update fails with a forbidden or permission denied
 *    error, proving correct boundary enforcement.
 */
export async function test_api_appeal_moderator_update_permission_denied_for_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register moderator 1
  const mod1_email = typia.random<string & tags.Format<"email">>();
  const mod1_password = "Mod1passw*rd!1";
  const mod1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod1_email,
      username: RandomGenerator.name(2),
      password: mod1_password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(mod1);

  // 2. Register normal user
  const user_email = typia.random<string & tags.Format<"email">>();
  const user_password = "UserPW_password@2";
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: user_email,
      username: RandomGenerator.name(2),
      password: user_password,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 3. Login as user for appeal creation
  await api.functional.auth.user.login(connection, {
    body: {
      email: user_email,
      password: user_password,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 4. User files an appeal
  const appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: user.user.id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // 5. Register mod2 and switch context to mod2
  const mod2_email = typia.random<string & tags.Format<"email">>();
  const mod2_password = "Mod2pw@rdSTr0ng";
  const mod2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod2_email,
      username: RandomGenerator.name(2),
      password: mod2_password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(mod2);

  // 6. Login as mod2 (ensures Authorization context is mod2)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mod2_email,
      password: mod2_password,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 7. As mod2, attempt to update user's appeal (should be forbidden)
  await TestValidator.error(
    "unauthorized moderator cannot update another's appeal",
    async () => {
      await api.functional.discussionBoard.moderator.appeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            resolution_comment: "Should be forbidden update.",
          } satisfies IDiscussionBoardAppeal.IUpdate,
        },
      );
    },
  );
}
