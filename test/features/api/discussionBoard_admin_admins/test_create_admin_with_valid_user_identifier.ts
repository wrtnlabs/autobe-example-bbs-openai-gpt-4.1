import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate successful creation of a new discussion board admin.
 *
 * This test verifies that when a unique and valid user_identifier (such as an
 * email or SSO ID) is provided, a new admin user can be created through the
 * API. It checks that the returned record includes the generated id, the
 * user_identifier provided, granted_at is set to a valid time, and revoked_at
 * is null (indicating active assignment). The response must contain all the
 * expected admin fields as per the contract. Audit log triggering is referenced
 * in scenario, but cannot be directly validated with available API and types,
 * so is omitted from this test. Failure edge cases are not addressed as this
 * test covers the normal successful creation path.
 *
 * Steps:
 *
 * 1. Prepare a unique user_identifier (e.g., random email string).
 * 2. Call the admin creation API with the unique user_identifier, granted_at set
 *    to "now", revoked_at as null.
 * 3. Assert that the returned admin object has:
 *
 *    - A valid id (uuid format)
 *    - User_identifier matching the input
 *    - Granted_at set and is a valid date-time string (should reflect input value)
 *    - Revoked_at is null
 *    - All contract fields are present
 */
export async function test_api_discussionBoard_admin_admins_test_create_admin_with_valid_user_identifier(
  connection: api.IConnection,
) {
  // 1. Prepare a unique user_identifier (simulate with random, realistic email as external id)
  const unique_identifier: string = typia.random<
    string & tags.Format<"email">
  >();

  // 2. Prepare assignment time (now)
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 3. Attempt to create admin via API
  const created = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: unique_identifier,
        granted_at: now,
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(created);

  // 4. Validate result matches contract and input
  TestValidator.predicate("ID is valid uuid")(
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.equals("user_identifier matches")(created.user_identifier)(
    unique_identifier,
  );
  TestValidator.equals("granted_at matches input")(created.granted_at)(now);
  TestValidator.equals("revoked_at is null")(created.revoked_at)(null);
}
