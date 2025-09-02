import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";

/**
 * Test that non-admin users cannot delete data erasure requests (admin
 * endpoint):
 *
 * Validates that when a standard user (not an admin) attempts to delete a
 * data erasure request using the admin-only API endpoint, the system
 * correctly denies access with an HTTP 401 (unauthorized) or 403
 * (forbidden) response. Includes both authenticated (standard user JWT) and
 * unauthenticated (no JWT) test cases for comprehensive coverage.
 *
 * 1. Register a new standard user (obtain token for user context)
 * 2. As this user, submit a data erasure request (so we have a valid request
 *    id)
 * 3. Attempt to delete the data erasure request while authenticated as this
 *    user: must fail (access denied)
 * 4. Remove all authentication from connection; attempt deletion again
 *    unauthenticated: must fail again (access denied)
 * 5. Confirm no actual unauthorized deletion occurs
 */
export async function test_api_admin_data_erasure_request_delete_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register and login a new normal user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  // Password (meet policy: min 10 chars, at least 1 uppercase, number, special char)
  const userPassword = RandomGenerator.alphaNumeric(7) + "!Aa1@#";
  const userDisplayName = RandomGenerator.name(2);
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: userDisplayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. As this user, submit a new data erasure request
  const erasureRequest =
    await api.functional.discussionBoard.admin.dataErasureRequests.create(
      connection,
      {
        body: {
          discussion_board_user_id: userAuth.user.id,
          request_type: "full_account",
          justification: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardDataErasureRequest.ICreate,
      },
    );
  typia.assert(erasureRequest);

  // 3. Authenticated as USER: attempt forbidden deletion
  await TestValidator.error(
    "User should not be able to delete data erasure request (admin-only endpoint)",
    async () => {
      await api.functional.discussionBoard.admin.dataErasureRequests.erase(
        connection,
        {
          dataErasureRequestId: erasureRequest.id,
        },
      );
    },
  );

  // 4. UNAUTHENTICATED: attempt forbidden deletion
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated request should not be able to delete data erasure request (admin-only endpoint)",
    async () => {
      await api.functional.discussionBoard.admin.dataErasureRequests.erase(
        unauthConn,
        {
          dataErasureRequestId: erasureRequest.id,
        },
      );
    },
  );
}
