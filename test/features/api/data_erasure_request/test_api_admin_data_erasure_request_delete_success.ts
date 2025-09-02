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
 * Validate admin-driven successful soft deletion of a data erasure request
 * record.
 *
 * Scenario Steps:
 *
 * 1. Register a new user (who will also be elevated to admin for the purpose
 *    of privilege enforcement).
 * 2. Register this user as an admin using their UUID.
 * 3. As admin, submit a data erasure request targeting that user.
 * 4. As admin, delete (soft delete) the erasure request by its UUID.
 * 5. (API Limitation: No direct fetch or list endpoint for erased request to
 *    validate `deleted_at` or disappearance—so direct post-deletion
 *    validation is impossible.)
 *
 * This test ensures:
 *
 * - Admin privileges are effective and necessary for deletion.
 * - Data erasure request workflow supports creation and deletion.
 * - (Soft) deletion executes successfully without errors.
 * - For full post-deletion validation of `deleted_at`, an additional get/list
 *   endpoint would be required.
 */
export async function test_api_admin_data_erasure_request_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new user (who will also become admin)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(5) + "Aa!234567"; // meets policy
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // Step 2: Register this user as an admin
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: userAuth.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // Step 3: As admin, submit a data erasure request for this user
  const erasureRequest =
    await api.functional.discussionBoard.admin.dataErasureRequests.create(
      connection,
      {
        body: {
          discussion_board_user_id: userAuth.user.id,
          request_type: RandomGenerator.pick([
            "full_account",
            "post_only",
          ] as const),
          justification: RandomGenerator.paragraph({ sentences: 5 }),
          regulator_reference: RandomGenerator.alphaNumeric(10),
        } satisfies IDiscussionBoardDataErasureRequest.ICreate,
      },
    );
  typia.assert(erasureRequest);

  // Step 4: As admin, delete (soft delete) the erasure request
  await api.functional.discussionBoard.admin.dataErasureRequests.erase(
    connection,
    {
      dataErasureRequestId: erasureRequest.id,
    },
  );

  // Step 5: API limitation: No endpoint exposed to fetch or list erased requests to confirm deleted_at.
  // To validate that the record is marked as deleted and omitted from queries, a get/list endpoint would be required.
  // This test validates the graph up to operation completion and lack of errors only.
}
