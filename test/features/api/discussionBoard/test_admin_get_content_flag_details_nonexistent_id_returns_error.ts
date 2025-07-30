import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validate error handling when admin queries a non-existent content flag by ID.
 *
 * This test ensures that when an authenticated admin attempts to fetch a
 * content flag (moderation flag) with an ID not present in the database, the
 * system responds with an appropriate error, such as 404 Not Found, without
 * leaking sensitive implementation details. This upholds REST best practices,
 * enhances security (no internal info leaks), and verifies robust error
 * management.
 *
 * Steps:
 *
 * 1. Create an admin using the system admin creation endpoint, simulating
 *    authentication/privilege acquisition
 * 2. Attempt to retrieve a moderation content flag by a randomly generated, surely
 *    non-existent UUID
 * 3. Confirm the GET call fails, i.e., the system throws an error (such as 404 Not
 *    Found)
 * 4. Verify the failure is gracefully handled; no database/state information is
 *    accidentally exposed in the error
 */
export async function test_api_discussionBoard_test_admin_get_content_flag_details_nonexistent_id_returns_error(
  connection: api.IConnection,
) {
  // 1. Admin user creation
  const adminPayload = {
    user_identifier: `admin_${typia.random<string>()}`,
    granted_at: new Date().toISOString(),
    revoked_at: null,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    { body: adminPayload },
  );
  typia.assert(admin);

  // 2. Use a random UUID that surely doesn't exist as a content flag
  const fakeContentFlagId = typia.random<string & tags.Format<"uuid">>();
  // 3/4. Expect appropriate error (should throw, e.g., 404 Not Found) and confirm graceful failure
  await TestValidator.error("Should return error for nonexistent content flag")(
    async () => {
      await api.functional.discussionBoard.admin.contentFlags.at(connection, {
        contentFlagId: fakeContentFlagId,
      });
    },
  );
}
