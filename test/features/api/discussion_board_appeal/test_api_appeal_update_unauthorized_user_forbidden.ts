import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Ensure users cannot update another user's appeal (access control
 * enforced)
 *
 * Business context: Appeals are user-submitted objects intended for
 * moderation review. Only the original appellant (or a moderator/admin)
 * should be allowed to update their appeal. Allowing unauthorized edits
 * would break trust and compliance. This test ensures that the backend
 * rejects edits initiated by a different authenticated user account.
 *
 * Workflow:
 *
 * 1. Register user1 (unique email, username)
 * 2. Register user2 (unique email, username)
 * 3. As user1, create an appeal, save appealId
 * 4. Switch to user2 (authentication context)
 * 5. Attempt to update user1's appeal using the appealId
 * 6. Confirm the update operation fails with forbidden (authorization error)
 * 7. No part of the appeal should change, and error must be detected
 */
export async function test_api_appeal_update_unauthorized_user_forbidden(
  connection: api.IConnection,
) {
  // 1. Register user1 and keep session
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.alphaNumeric(10);
  const user1Password = RandomGenerator.alphaNumeric(9) + "Aa$1";
  const user1Reg = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: user1Password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1Reg);
  const user1Id = user1Reg.user.id;

  // 2. As user1, create an appeal
  const appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: user1Id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);
  const appealId = appeal.id;

  // 3. Register user2 and switch session
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.alphaNumeric(10);
  const user2Password = RandomGenerator.alphaNumeric(8) + "Bb#2";
  const user2Reg = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2Reg);
  // At this point, connection.headers.Authorization is for user2

  // 4. Attempt to update user1's appeal as user2
  await TestValidator.error(
    "forbid user2 from updating user1's appeal",
    async () => {
      await api.functional.discussionBoard.user.appeals.update(connection, {
        appealId,
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IDiscussionBoardAppeal.IUpdate,
      });
    },
  );
}
