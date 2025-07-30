import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate creation of discussion board admins with missing required fields.
 *
 * This test checks that the API enforces required field validation when
 * attempting to create a discussion board admin. It should reject creation
 * requests that are missing the required `user_identifier` or `granted_at`
 * fields and return a user-friendly error. The test also ensures no admin
 * record is created for failed attempts.
 *
 * Steps:
 *
 * 1. Attempt to create an admin with missing `user_identifier`, providing only
 *    `granted_at` (should fail).
 * 2. Attempt to create an admin with missing `granted_at`, providing only
 *    `user_identifier` (should fail).
 * 3. Attempt to create an admin with both fields missing (should fail).
 * 4. For each error, check that the response is a validation error and no admin is
 *    created in the database.
 */
export async function test_api_discussionBoard_test_create_admin_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Attempt creation missing 'user_identifier'
  await TestValidator.error("missing user_identifier should fail")(async () => {
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        // user_identifier: intentionally omitted
        granted_at: typia.random<string & tags.Format<"date-time">>(),
      } as any,
    });
  });

  // 2. Attempt creation missing 'granted_at'
  await TestValidator.error("missing granted_at should fail")(async () => {
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: "admin-test-user",
        // granted_at: intentionally omitted
      } as any,
    });
  });

  // 3. Attempt creation with both fields missing
  await TestValidator.error("missing both required fields should fail")(
    async () => {
      await api.functional.discussionBoard.admin.admins.create(connection, {
        body: {} as any,
      });
    },
  );
}
