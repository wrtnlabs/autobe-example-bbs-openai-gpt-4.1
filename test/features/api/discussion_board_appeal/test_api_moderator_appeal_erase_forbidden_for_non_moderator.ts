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
 * Validate that non-moderators cannot delete appeals via moderator endpoint
 *
 * Scenario steps:
 *
 * 1. Register a regular user (with consent)
 * 2. Log in as that user if necessary
 * 3. Create an appeal via the user appeal creation endpoint
 * 4. Attempt to delete this appeal via the moderator endpoint, authenticated
 *    only as the regular user
 * 5. Assert the operation fails with forbidden/authorization error
 * 6. (Optional for this scenario: confirm that the appeal still exists—should
 *    be tested elsewhere)
 */
export async function test_api_moderator_appeal_erase_forbidden_for_non_moderator(
  connection: api.IConnection,
) {
  // Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestP@ssw0rd123";
  const username = RandomGenerator.name();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password: userPassword,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // (Re-)login as user to ensure context (not strictly necessary, but robust)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // User creates an appeal
  const appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: userJoin.user.id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 8 }),
        // Minimal compliant: no refs
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // User (NOT moderator) attempts delete via moderator endpoint
  await TestValidator.error(
    "forbidden: user cannot forcibly delete via moderator endpoint",
    async () => {
      await api.functional.discussionBoard.moderator.appeals.erase(connection, {
        appealId: appeal.id,
      });
    },
  );
}
