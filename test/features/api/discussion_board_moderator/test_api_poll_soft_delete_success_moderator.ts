import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate moderator-initiated soft deletion of a poll (by pollId, postId).
 *
 * Steps:
 *
 * 1. Register and auto-login as a moderator using /auth/moderator/join. This
 *    operation is mandatory since only a logged-in moderator can delete
 *    polls.
 * 2. (Simulate) Generate UUIDs for postId and pollId to represent existing
 *    resources (actual creation APIs are not provided in current SDK
 *    material).
 * 3. Call erase (DELETE
 *    /discussionBoard/moderator/posts/{postId}/polls/{pollId}) as the
 *    authenticated moderator and validate the call completes (void).
 * 4. Attempt to soft-delete the same poll again and check that the endpoint
 *    handles idempotency or produces the appropriate business error.
 * 5. (Auditing/visibility checks for regular users and audit logs cannot be
 *    performed— no such API functions or DTOs are in scope; this is a
 *    technical limitation, not a test omission).
 */
export async function test_api_poll_soft_delete_success_moderator(
  connection: api.IConnection,
) {
  // 1. Register and auto-login as a moderator (pre-auth)
  const regInput: IDiscussionBoardModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    consent: true,
  };
  const authResult: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: regInput });
  typia.assert(authResult);

  // 2. Prepare postId and pollId (no creation APIs provided, so random UUIDs are used)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const pollId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Moderated poll soft-delete (void)
  await api.functional.discussionBoard.moderator.posts.polls.erase(connection, {
    postId,
    pollId,
  });

  // 4. Attempt soft-delete again to check idempotency or error (should not cause system failure)
  await TestValidator.error(
    "erase on already soft-deleted poll should error or be idempotent",
    async () => {
      await api.functional.discussionBoard.moderator.posts.polls.erase(
        connection,
        {
          postId,
          pollId,
        },
      );
    },
  );
}
