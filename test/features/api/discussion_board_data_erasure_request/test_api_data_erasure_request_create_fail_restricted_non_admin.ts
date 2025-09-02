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
 * Test that non-admin (regular user) cannot create data erasure request via
 * the admin-only API endpoint.
 *
 * 1. Register a standard user by calling /auth/user/join with unique details.
 *
 *    - Save the resulting user id for the test attempt.
 * 2. Attempt to POST /discussionBoard/admin/dataErasureRequests using the
 *    non-admin account, passing the user's id as the data subject and a
 *    plausible request payload.
 * 3. Assert that the attempt fails with a forbidden/unauthorized error (API
 *    blocks non-admins at the access control layer).
 * 4. Confirm by error assertion that no data erasure request record is
 *    returned nor created in violation of access policy.
 */
export async function test_api_data_erasure_request_create_fail_restricted_non_admin(
  connection: api.IConnection,
) {
  // 1. Register a standard user
  const joinUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(12) + "A!",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinUser);
  const userId = joinUser.user.id;

  // 2. Attempt as non-admin to create a data erasure request on the admin-only endpoint (should fail)
  await TestValidator.error(
    "non-admin cannot create data erasure request via admin endpoint",
    async () => {
      await api.functional.discussionBoard.admin.dataErasureRequests.create(
        connection,
        {
          body: {
            discussion_board_user_id: userId,
            request_type: "full_account",
            justification: RandomGenerator.paragraph(),
            regulator_reference: RandomGenerator.alphaNumeric(8),
          } satisfies IDiscussionBoardDataErasureRequest.ICreate,
        },
      );
    },
  );
}
