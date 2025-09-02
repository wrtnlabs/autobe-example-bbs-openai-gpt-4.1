import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Test moderator deletion attempt on non-existent appeal entity.
 *
 * This test confirms the system correctly enforces not-found error handling
 * for a moderator attempting to soft-delete (retire) an appeal with an
 * invalid (non-existent) appealId.
 *
 * Step-by-step process:
 *
 * 1. Register and authenticate as moderator (obtain auth context)
 * 2. Attempt to delete a random/non-existent appeal (use random UUID for
 *    appealId)
 * 3. Validate system response: must signal not found (404 error) and NOT
 *    perform the delete
 * 4. Confirm there is no silent success or unauthorized record change
 *
 * Outcomes:
 *
 * - System responds with proper error (404 Not Found)
 * - Audit trail/data integrity is preserved
 */
export async function test_api_moderator_appeal_erase_not_found(
  connection: api.IConnection,
) {
  // 1. Moderator registration/authentication
  const joinInput: IDiscussionBoardModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    consent: true,
  };
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: joinInput });
  typia.assert(moderator);

  // 2. Attempt to soft-delete a non-existent appeal (use random UUID, not matching any real appeal)
  const nonExistentAppealId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "DELETE /discussionBoard/moderator/appeals/:appealId on non-existent appeal should return not found error",
    async () => {
      await api.functional.discussionBoard.moderator.appeals.erase(connection, {
        appealId: nonExistentAppealId,
      });
    },
  );
}
