import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";

/**
 * E2E test for retrieving detailed information for a specific data erasure
 * request as an admin.
 *
 * This test simulates the full admin authentication flow. It registers an
 * admin account, and then attempts to retrieve a data erasure request using
 * the admin-only endpoint GET
 * /discussionBoard/admin/dataErasureRequests/{dataErasureRequestId}. The
 * request id will be generated randomly, as there is no API to directly
 * create a data erasure request in the provided materials.
 *
 * The test validates:
 *
 * 1. When authenticated as admin, requesting with a valid erasure request id
 *    returns all fields for compliance, audit, and justification (full
 *    IDiscussionBoardDataErasureRequest structure).
 * 2. When requesting with a random invalid id, the API should return not-found
 *    error.
 * 3. When not authenticated as admin, access to this endpoint is denied
 *    (access error).
 *
 * Steps:
 *
 * 1. Register admin using /auth/admin/join with a random user_id.
 * 2. Retrieve a data erasure request by ID as admin (using typia.random for
 *    the ID).
 * 3. Validate all returned fields match type
 *    IDiscussionBoardDataErasureRequest.
 * 4. Attempt retrieval with a random, likely non-existent UUID, and expect
 *    not-found error.
 * 5. Remove admin Authorization header and attempt access, expect
 *    access/authorization error.
 */
export async function test_api_data_erasure_request_admin_get_success(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const admin = adminJoin.admin;

  // Step 2: Retrieve a data erasure request by ID (random, since no create API is present)
  const erasureRequestId = typia.random<string & tags.Format<"uuid">>();
  const dataErasureRequest =
    await api.functional.discussionBoard.admin.dataErasureRequests.at(
      connection,
      {
        dataErasureRequestId: erasureRequestId,
      },
    );
  typia.assert(dataErasureRequest);
  // Validate expected fields for compliance/audit/justification
  TestValidator.equals(
    "request id should match",
    dataErasureRequest.id,
    erasureRequestId,
  );
  TestValidator.predicate(
    "must have proper request_type string",
    typeof dataErasureRequest.request_type === "string",
  );
  TestValidator.predicate(
    "must have status string",
    typeof dataErasureRequest.status === "string",
  );
  TestValidator.predicate(
    "should expose justification field",
    "justification" in dataErasureRequest,
  );
  TestValidator.predicate(
    "should expose regulator_reference field",
    "regulator_reference" in dataErasureRequest,
  );

  // Step 3: Attempt to get with a random, likely non-existent UUID and expect error
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail for non-existent erasure request id",
    async () => {
      await api.functional.discussionBoard.admin.dataErasureRequests.at(
        connection,
        {
          dataErasureRequestId: invalidId,
        },
      );
    },
  );

  // Step 4: Remove Authorization and expect access error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should not be accessible without admin authentication",
    async () => {
      await api.functional.discussionBoard.admin.dataErasureRequests.at(
        unauthConn,
        {
          dataErasureRequestId: erasureRequestId,
        },
      );
    },
  );
}
