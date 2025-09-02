import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates strict ownership enforcement on preference deletion.
 *
 * Ensures that only the owner of a notification preference can delete it.
 * Registers two users. User1 acts as the owner (having the target
 * preference), user2 as the attacker. The test confirms that user2 is
 * forbidden from deleting user1's preference by expecting an error, thus
 * confirming the API is secure against unauthorized access to this
 * resource.
 */
export async function test_api_notification_preference_delete_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register user1 (preference owner)
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1Password = RandomGenerator.alphaNumeric(12) + "A!3";
  const user1: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user1Email,
        username: user1Username,
        password: user1Password,
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user1);

  // Simulate creation of a notification preference for user1 (no actual API exists to create preferences)
  // We'll use a random UUID for the preferenceId the preference "owned" by user1
  const preferenceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Register user2 (attacker)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = RandomGenerator.alphaNumeric(12) + "A!3";
  const user2: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user2Email,
        username: user2Username,
        password: user2Password,
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user2);

  // Now, context is switched to user2 (join sets Authorization to user2)

  // 3. While authenticated as user2, attempt to delete user1's preference
  await TestValidator.error(
    "user2 cannot delete user1's notification preference (ownership enforcement)",
    async () => {
      await api.functional.discussionBoard.user.notificationPreferences.erase(
        connection,
        {
          preferenceId,
        },
      );
    },
  );
}
