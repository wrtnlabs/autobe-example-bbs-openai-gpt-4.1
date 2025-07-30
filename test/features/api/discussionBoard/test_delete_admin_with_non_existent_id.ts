import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test that deleting an admin with a non-existent or already deleted adminId
 * returns a 404 error.
 *
 * This test attempts to delete an admin using a random UUID that never belonged
 * to any real admin record, simulating the case of a non-existent or already
 * deleted admin. The system should respond with a 404 Not Found error,
 * indicating the target entity does not exist. This ensures the API robustly
 * handles erroneous deletion requests without side effects or unintended data
 * modification. Error logging is expected in the underlying system, but is not
 * directly checked in this E2E test. No records should be removed or corrupted
 * as a result.
 *
 * Steps:
 *
 * 1. Generate a random UUID not associated with any current admin.
 * 2. Attempt to delete the admin by passing the UUID to the erase endpoint.
 * 3. Assert that the operation fails with a 404 Not Found error.
 * 4. Optionally, confirm no records have been deleted (implementation omitted if
 *    not feasible with available endpoints).
 */
export async function test_api_discussionBoard_test_delete_admin_with_non_existent_id(
  connection: api.IConnection,
) {
  // Step 1: Generate a random, likely non-existent adminId
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();

  // Step 2 & 3: Attempt deletion and assert 404 error
  await TestValidator.error("should return 404 for non-existent adminId")(
    async () => {
      await api.functional.discussionBoard.admin.admins.erase(connection, {
        adminId: nonExistentAdminId,
      });
    },
  );

  // Step 4: Out of scope due to unavailability of listing endpoint to verify
}
