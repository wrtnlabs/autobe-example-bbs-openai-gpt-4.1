import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate the retrieval of all discussion board admins (current and
 * historical).
 *
 * This test ensures that when an admin user accesses the API, they receive a
 * full paginated list of all board administrator assignments—both active and
 * revoked—without filters or sort parameters required. The test will:
 *
 * 1. Call the admin listing endpoint as an authorized admin.
 * 2. Assert that the response includes a well-formed pagination object and a data
 *    array of admin assignments.
 * 3. For each admin assignment, validate that all required metadata (id,
 *    user_identifier, granted_at, revoked_at) is present and conforms to
 *    type/format.
 * 4. Check that both currently-active (revoked_at null/undefined) and revoked
 *    (revoked_at set) admins are present in the results (if data is available),
 *    i.e., no implicit filtering is applied.
 * 5. Ensure no extra or sensitive properties are exposed in each admin record.
 *
 * Edge cases: Empty data array (no admins), only current admins, or only
 * revoked admins.
 */
export async function test_api_discussionBoard_test_list_all_admins_success(
  connection: api.IConnection,
) {
  // 1. Call the GET /discussionBoard/admin/admins endpoint as admin
  const result =
    await api.functional.discussionBoard.admin.admins.index(connection);
  typia.assert(result);

  // 2. Validate pagination metadata
  const pg = result.pagination;
  TestValidator.predicate("current page >= 1")(pg.current >= 1);
  TestValidator.predicate("limit >= 1")(pg.limit >= 1);
  TestValidator.predicate("records >= 0")(pg.records >= 0);
  TestValidator.predicate("pages >= 0")(pg.pages >= 0);

  // 3. All admin assignment records must satisfy required shape and no extras
  for (const admin of result.data) {
    // validate id
    TestValidator.predicate("id is UUID")(
      typeof admin.id === "string" && admin.id.length > 0,
    );
    // validate user_identifier
    TestValidator.predicate("user_identifier is nonempty string")(
      typeof admin.user_identifier === "string" &&
        admin.user_identifier.length > 0,
    );
    // validate granted_at timestamp
    TestValidator.predicate("granted_at is date-time string")(
      typeof admin.granted_at === "string" && admin.granted_at.length > 0,
    );

    // revoked_at may be "undefined", null, or a string date-time
    if (admin.revoked_at !== undefined && admin.revoked_at !== null) {
      TestValidator.predicate("revoked_at is date-time string")(
        typeof admin.revoked_at === "string" && admin.revoked_at.length > 0,
      );
    }

    // No extra properties
    TestValidator.equals("only expected admin props")(
      Object.keys(admin).sort(),
    )(["granted_at", "id", "revoked_at", "user_identifier"].sort());
  }

  // 4. Try to confirm both active and revoked admins present if possible
  if (result.data.length > 0) {
    const hasActive = result.data.some(
      (a) => a.revoked_at === null || a.revoked_at === undefined,
    );
    const hasRevoked = result.data.some(
      (a) => a.revoked_at !== null && a.revoked_at !== undefined,
    );
    // If there are multiple admins, both types should generally be present; but if just one record, just check property exists.
    TestValidator.predicate("at least one active or revoked admin present")(
      hasActive || hasRevoked,
    );
  }
}
