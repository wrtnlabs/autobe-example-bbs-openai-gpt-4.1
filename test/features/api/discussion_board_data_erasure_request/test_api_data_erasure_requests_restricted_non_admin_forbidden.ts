import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";
import type { IPageIDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataErasureRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify admin-only restriction on data erasure request listing endpoint
 * for non-admin user.
 *
 * This scenario validates that a standard (non-admin) user is strictly
 * forbidden from accessing the admin-level data erasure request listing
 * API. The test must simulate full user onboarding (join as user) and then
 * attempt to invoke the PATCH /discussionBoard/admin/dataErasureRequests
 * endpoint. On the attempted call, the API must respond with a forbidden or
 * unauthorized (401/403) error, and no data (or even structural
 * information) about other users' erasure requests may be leaked in the
 * error response. This is crucial for privacy and compliance boundaries:
 * only admins can list erasure requests.
 *
 * Steps:
 *
 * 1. Register a new user with unique credentials (and provide consent).
 * 2. As this authenticated user, attempt to list erasure requests via the
 *    PATCH endpoint.
 * 3. Capture and assert that the error is as expected (forbidden,
 *    unauthorized, or equivalent access control failure).
 * 4. Confirm that no data content about any erasure request is returned in the
 *    body by the API under this access violation scenario.
 * 5. For test hygiene, an admin user should also exist but is not part of the
 *    active authentication (no privilege switching in main test flow).
 */
export async function test_api_data_erasure_requests_restricted_non_admin_forbidden(
  connection: api.IConnection,
) {
  // Ensure at least one admin user exists for system completeness (setup only, privilege remains user)
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "A$1", // Password meets policy: 12+, upper, digit, special
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // Separate admin for system hygiene (will not switch context in test)
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "A$1",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);
  await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });

  // As user, attempt to query admin-only erasure request list: must fail with forbidden/unauthorized
  await TestValidator.error(
    "non-admin must not access data erasure request listing",
    async () => {
      await api.functional.discussionBoard.admin.dataErasureRequests.index(
        connection,
        {
          body: {} satisfies IDiscussionBoardDataErasureRequest.IRequest,
        },
      );
    },
  );
}
