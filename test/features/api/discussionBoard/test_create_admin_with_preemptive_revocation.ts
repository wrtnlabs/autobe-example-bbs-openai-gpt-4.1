import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate preemptive admin revocation through timed assignment.
 *
 * This test ensures that you can create an admin with a future `revoked_at`
 * timestamp, simulating a time-limited admin role. Upon creation, it should
 * verify that the assignment has both `granted_at` and `revoked_at` set
 * properly in the output.
 *
 * Because the SDK does not provide admin action endpoints or privilege
 * enforcement APIs, this test focuses on validating the creation and correct
 * time field population, and cannot check enforcement of admin privilege beyond
 * the revoked time (would require separate endpoints to perform admin actions
 * after the revocation timestamp).
 *
 * Steps:
 *
 * 1. Define an admin user identifier (string).
 * 2. Use current time for `granted_at` and a future ISO date for `revoked_at`
 *    (e.g., +7 days).
 * 3. Call the API to create the admin assignment.
 * 4. Assert that the returned record has the same `user_identifier`, identical
 *    `granted_at`, and matching `revoked_at`.
 * 5. (Optional, not implementable here): If future test coverage expands, attempt
 *    admin actions after `revoked_at` to check privilege enforcement.
 */
export async function test_api_discussionBoard_test_create_admin_with_preemptive_revocation(
  connection: api.IConnection,
) {
  // Step 1: Define test data
  const user_identifier = `e2etest-admin-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const now = new Date();
  const granted_at = now.toISOString();
  const revoked = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
  const revoked_at: string = revoked.toISOString();

  // Step 2: Create preemptively-revoked admin
  const result = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier,
        granted_at,
        revoked_at,
      },
    },
  );
  typia.assert(result);
  TestValidator.equals("user_identifier match")(result.user_identifier)(
    user_identifier,
  );
  TestValidator.equals("granted_at match")(result.granted_at)(granted_at);
  TestValidator.equals("revoked_at match")(result.revoked_at)(revoked_at);
}
