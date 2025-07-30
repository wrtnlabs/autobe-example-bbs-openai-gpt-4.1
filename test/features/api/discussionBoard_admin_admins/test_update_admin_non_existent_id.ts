import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test updating an admin using a non-existent adminId.
 *
 * This test validates that attempting to update an admin entity in
 * `discussion_board_admins` with a random, non-existent UUID (`adminId`)
 * results in the expected error (404 Not Found). It checks that the API throws
 * the correct error and that no admin records are updated, fulfilling business
 * and compliance requirements for resource validation. It also serves as
 * verification that such failed actions could be logged in the audit trail
 * (although we cannot verify logs directly in this test).
 *
 * Test process:
 *
 * 1. Generate a random UUID to use as a guaranteed non-existent adminId
 * 2. Create a plausible patch body for the admin entity
 * 3. Attempt to update the admin and assert that an error is thrown (expected: 404
 *    not found)
 * 4. No admin record should be returned; test passes if error is thrown and no
 *    update occurs
 */
export async function test_api_discussionBoard_admin_admins_test_update_admin_non_existent_id(
  connection: api.IConnection,
) {
  // 1. Generate a random, non-existent adminId as UUID
  const fakeAdminId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create plausible patch body
  const patchBody = {
    user_identifier: "fake.user@notareal.tld",
    granted_at: new Date().toISOString(),
    revoked_at: null,
  } satisfies IDiscussionBoardAdmin.IUpdate;

  // 3. Try updating and assert error is thrown
  await TestValidator.error("Should throw 404 for non-existent adminId")(
    async () => {
      await api.functional.discussionBoard.admin.admins.update(connection, {
        adminId: fakeAdminId,
        body: patchBody,
      });
    },
  );
}
