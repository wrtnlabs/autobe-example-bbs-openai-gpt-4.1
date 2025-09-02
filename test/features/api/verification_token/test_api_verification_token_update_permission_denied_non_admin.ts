import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVerificationToken";

/**
 * Verify that non-admin users cannot update a verification token's
 * metadata.
 *
 * This E2E test ensures that non-admin (regular) users are strictly
 * forbidden from updating verification tokens using the admin-only
 * endpoint. This is a critical security requirement for the discussion
 * board system, as only high-privilege admin users should be allowed to
 * adjust verification token metadata (expiry, usage, etc). The test
 * attempts the operation as a normal authenticated user and expects
 * explicit denial (authorization/forbidden error).
 *
 * Step-by-step process:
 *
 * 1. Register a new user as a standard (non-admin) member using the public
 *    /auth/user/join endpoint. This fully simulates a regular user
 *    registration flow.
 * 2. Attempt to update verification token metadata using the admin endpoint
 *    PUT /discussionBoard/admin/verificationTokens/{verificationTokenId} as
 *    this newly joined, non-admin member. A random UUID is used for the
 *    token ID (the actual token need not exist, as the test's purpose is
 *    strictly permission denial).
 *
 *    - Supply a body with valid IDiscussionBoardVerificationToken.IUpdate fields
 *         (e.g., random new expiry and null usage mark).
 * 3. Assert that the API rejects this request due to insufficient permissions,
 *    confirming that only admin-privileged users can perform this
 *    operation. The error should be a clear forbidden/unauthorized type,
 *    not a generic not found or validation error.
 *
 * This verifies that permission checks are enforced at the API contract
 * level, not by client role expectations or soft UI logic, and that
 * sensitive admin endpoints are effectively secured.
 */
export async function test_api_verification_token_update_permission_denied_non_admin(
  connection: api.IConnection,
) {
  // 1. Register a new normal (non-admin) user
  const normalUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(normalUser);

  // 2. Attempt to update a verification token as non-admin (should be forbidden)
  await TestValidator.error(
    "non-admin users cannot update verification token metadata",
    async () => {
      await api.functional.discussionBoard.admin.verificationTokens.update(
        connection,
        {
          verificationTokenId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            used_at: null,
          } satisfies IDiscussionBoardVerificationToken.IUpdate,
        },
      );
    },
  );
}
