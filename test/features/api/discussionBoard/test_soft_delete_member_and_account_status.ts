import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test soft-deleting a member by UUID and validating account status.
 *
 * This test simulates the end-to-end workflow of soft-deleting a discussion board member as an administrator:
 * - Registers a new member account
 * - Soft-deletes the member using the provided UUID via admin endpoint
 * - Verifies that preconditions (not deleted, active) were met
 * - Validates that deletion for already-deleted and non-existent members returns errors
 *
 * Coverage:
 * 1. Registers a new discussion board member
 * 2. Validates preconditions (deleted_at=null, is_active=true)
 * 3. Soft-deletes (eraseById) the member by id
 * 4. Re-attempts delete for already-deleted member (error expected)
 * 5. Attempts delete for non-existent UUID (error expected)
 *
 * Due to provided SDK constraints, post-delete state can only be validated via typing/assertion,
 * not re-retrieval/listings/logins. Any moderation role or audit fields are not directly inspectable here.
 *
 * Future enhancement: If listing/detail endpoints are added, test must query post-deletion state.
 */
export async function test_api_discussionBoard_test_soft_delete_member_and_account_status(
  connection: api.IConnection
) {
  // 1. Register a new member
  const memberData: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(24),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, { body: memberData });
  typia.assert(member);
  TestValidator.equals("precondition - member not deleted")(member.deleted_at)(null);
  TestValidator.equals("precondition - member is active")(member.is_active)(true);

  // 2. Soft-delete the member by id
  await api.functional.discussionBoard.members.eraseById(connection, { id: member.id });

  // 3. Attempt to delete again -- should error
  await TestValidator.error("Deleting already-deleted member should error")(async () => {
    await api.functional.discussionBoard.members.eraseById(connection, { id: member.id });
  });

  // 4. Attempt delete for non-existent member -- should also error
  await TestValidator.error("Deleting non-existent member should error")(async () => {
    await api.functional.discussionBoard.members.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>()
    });
  });

  // Note: Further validation (e.g., retrieving the member for deleted_at/is_active checks, login prevention, moderation record deletions)
  // is not feasible with current SDK—would require additional endpoints.
}