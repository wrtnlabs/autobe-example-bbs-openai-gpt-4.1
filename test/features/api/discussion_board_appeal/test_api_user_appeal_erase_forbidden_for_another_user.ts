import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Test that deleting an appeal is forbidden for users other than the
 * creator.
 *
 * This test validates strict enforcement of ownership and privacy rules:
 * Only the creator of an appeal (or privileged roles) can delete it. It
 * performs full context switching to prove ordinary users cannot delete
 * appeals they do not own.
 *
 * Steps:
 *
 * 1. Register User1 and authenticate
 * 2. User1 creates an appeal
 * 3. Register User2 and authenticate (switch context)
 * 4. User2 attempts to delete User1's appeal (should fail with forbidden)
 */
export async function test_api_user_appeal_erase_forbidden_for_another_user(
  connection: api.IConnection,
) {
  // 1. Register User1 and authenticate
  const user1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const user1Username: string = RandomGenerator.name(1);
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: "Password123!",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1);

  // 2. User1 creates an appeal
  const appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: user1.user.id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // 3. Register User2 and authenticate (switch context to User2)
  const user2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const user2Username: string = RandomGenerator.name(1);
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: "Password123!",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2);

  // 4. User2 attempts to delete User1's appeal (should fail with forbidden error)
  await TestValidator.error(
    "User2 forbidden from deleting another user's appeal",
    async () => {
      await api.functional.discussionBoard.user.appeals.erase(connection, {
        appealId: appeal.id,
      });
    },
  );
}
