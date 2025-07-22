import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * E2E test for revoking (soft-deleting) administrator assignments and permission handling in the discussion board.
 *
 * Validates the following business workflow and error scenarios:
 * 1. Register a new member to be assigned as administrator.
 * 2. Assign administrator privileges (unique assignment is created).
 * 3. Revoke (soft-delete) the administrator assignment using its ID; ensure system returns no error (void, 204).
 * 4. Attempt to delete the same (already-deleted) assignment again and expect an error.
 * 5. Attempt to delete a non-existent assignment (using a random UUID) and expect a not found error.
 *
 * Limitations:
 * - Cannot verify audit log or soft-deleted state due to missing "list"/"read" API endpoints.
 * - Cannot test non-admin RBAC block (member vs admin permissions) due to lack of authentication/user-switching APIs.
 * - TestValidator.error is used purely to confirm error occurrence, not error messages or codes.
 */
export async function test_api_discussionBoard_administrators_test_delete_administrator_assignment_and_permission_handling(connection: api.IConnection) {
  // 1. Register a new member who will be the admin to delete
  const newMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<'email'>>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(newMember);

  // 2. Assign administrator privileges to that member
  const adminAssignment = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: newMember.id,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(adminAssignment);

  // 3. Revoke (soft-delete) the administrator assignment by ID
  await api.functional.discussionBoard.administrators.eraseById(connection, {
    id: adminAssignment.id,
  });

  // 4. Attempt to delete the same assignment again (double-delete prevention)
  await TestValidator.error('double-deletion prevention')(() =>
    api.functional.discussionBoard.administrators.eraseById(connection, {
      id: adminAssignment.id,
    })
  );

  // 5. Attempt to delete a non-existent assignment
  await TestValidator.error('not found – non-existent assignment')(() =>
    api.functional.discussionBoard.administrators.eraseById(connection, {
      id: typia.random<string & tags.Format<'uuid'>>(),
    })
  );

  // Note: RBAC enforcement (admin-only delete) and post-delete audit checks cannot be done
  // in this E2E test due to missing authentication or list/read endpoints.
}