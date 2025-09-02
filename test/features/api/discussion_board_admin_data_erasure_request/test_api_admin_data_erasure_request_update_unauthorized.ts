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
 * Test forbidden update of data erasure request by unauthorized (non-admin)
 * user or unauthenticated context.
 *
 * This test verifies that only admin-authenticated sessions can update data
 * erasure requests, and that attempts by regular users or unauthenticated
 * clients are appropriately forbidden based on privilege. The test follows
 * this process:
 *
 * 1. Register a regular user and obtain their session (POST /auth/user/join).
 * 2. Submit a new data erasure request as that user (POST
 *    /discussionBoard/admin/dataErasureRequests).
 * 3. (Compliance) Register an admin user for full coverage (POST
 *    /auth/admin/join), but do NOT use admin session for this update test.
 * 4. Attempt to update the erasure request while authenticated as the regular
 *    user -- expect a privilege/forbidden error.
 * 5. Remove any authentication and attempt update again as an unauthenticated
 *    client -- again expect error.
 *
 * Each negative path is validated using TestValidator.error, ensuring
 * correct business rule enforcement. All data generation and authentication
 * handling follow secure, type-safe patterns.
 */
export async function test_api_admin_data_erasure_request_update_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a standard user and assert the structure
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const password = RandomGenerator.alphaNumeric(12) + "A!2";
  const displayName = RandomGenerator.name();
  const userReg = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userReg);
  const user = userReg.user;
  typia.assert(user);

  // 2. Submit a data erasure request as that user
  const erasureReq =
    await api.functional.discussionBoard.admin.dataErasureRequests.create(
      connection,
      {
        body: {
          discussion_board_user_id: user.id,
          request_type: RandomGenerator.pick([
            "full_account",
            "post_only",
            "other",
          ] as const),
          justification: RandomGenerator.paragraph({ sentences: 3 }),
          regulator_reference: RandomGenerator.alphaNumeric(10),
        } satisfies IDiscussionBoardDataErasureRequest.ICreate,
      },
    );
  typia.assert(erasureReq);

  // 3. Register an admin user (for system compliance, not used for main test)
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminReg);

  // 4. As the user, attempt forbidden erasure request update (should fail)
  await TestValidator.error(
    "forbid regular user from updating data erasure request (must be admin)",
    async () => {
      await api.functional.discussionBoard.admin.dataErasureRequests.update(
        connection,
        {
          dataErasureRequestId: erasureReq.id,
          body: {
            status: "processing",
          } satisfies IDiscussionBoardDataErasureRequest.IUpdate,
        },
      );
    },
  );

  // 5. Now remove authentication (simulate unauthenticated client) and try again
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "forbid unauthenticated client from updating data erasure request (must be admin)",
    async () => {
      await api.functional.discussionBoard.admin.dataErasureRequests.update(
        unauthConn,
        {
          dataErasureRequestId: erasureReq.id,
          body: {
            status: "completed",
          } satisfies IDiscussionBoardDataErasureRequest.IUpdate,
        },
      );
    },
  );
}
