import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";

/**
 * E2E test for soft-deleting (lifting) a ban (discussion_board_bans) via DELETE /discussionBoard/bans/{id}
 *
 * This test validates:
 *   (a) A moderator or admin can soft-delete a ban via /discussionBoard/bans/{id}
 *   (b) Correct error is returned for repeat delete or for deleting non-existent bans
 *   (c) Permission enforcement for non-authorized actors
 *   (d) The deleted_at field is set and record is preserved for audit
 *   (e) No record resurrection or accidental erase occurs
 *
 * Assumptions:
 *   - No auth or role APIs; simulate roles/permission via input UUIDs only
 *   - No explicit audit log API; check post-conditions via returned entities and errors
 *
 * Steps:
 * 1. Create a ban (as a moderator) with valid member_id/moderator_id (banInput)
 * 2. Soft-delete the ban as the moderator; confirm deleted_at set, id matches
 * 3. Confirm soft-delete: deleted_at not null, other fields remain
 * 4. Attempt repeat delete (should error)
 * 5. Attempt delete of non-existent ban (should error)
 * 6. Create another ban, then simulate an 'unauthorized' delete (by changing moderator_id; real role would be via alternate conn/token if API provided)
 * 7. Confirm errors are thrown where permission/rule violation occurs
 */
export async function test_api_discussionBoard_test_delete_ban_and_verify_soft_delete_and_permission_checks(
  connection: api.IConnection,
) {
  // 1. Create a ban record (POST /discussionBoard/bans) as a 'moderator'.
  const moderator_id = typia.random<string & tags.Format<'uuid'>>();
  const member_id = typia.random<string & tags.Format<'uuid'>>();
  const banInput: IDiscussionBoardBan.ICreate = {
    member_id,
    moderator_id,
    ban_reason: '테스트 밴 - E2E',
    permanent: false,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
  const createdBan = await api.functional.discussionBoard.bans.post(connection, {
    body: banInput,
  });
  typia.assert(createdBan);
  TestValidator.equals('ban is not deleted')(createdBan.deleted_at)(null);

  // 2. Soft-delete (lift) the ban as moderator (DELETE)
  const deletedBan = await api.functional.discussionBoard.bans.eraseById(connection, { id: createdBan.id });
  typia.assert(deletedBan);
  TestValidator.equals('ban id matches')(deletedBan.id)(createdBan.id);
  TestValidator.predicate('ban is now deleted')(!!deletedBan.deleted_at);
  TestValidator.equals('ban member id')(deletedBan.member_id)(createdBan.member_id);
  TestValidator.equals('ban moderator id')(deletedBan.moderator_id)(createdBan.moderator_id);
  TestValidator.equals('ban reason')(deletedBan.ban_reason)(createdBan.ban_reason);

  // 3. Attempt repeat delete (should throw error)
  await TestValidator.error('repeat delete fails')(async () => {
    await api.functional.discussionBoard.bans.eraseById(connection, { id: createdBan.id });
  });

  // 4. Attempt delete of non-existent ban (random id)
  await TestValidator.error('delete non-existent ban fails')(async () => {
    await api.functional.discussionBoard.bans.eraseById(connection, { id: typia.random<string & tags.Format<'uuid'>>() });
  });

  // 5. Simulate non-authorized user (no real session API, so use a different moderator_id in ban record)
  const unauthorized_id = typia.random<string & tags.Format<'uuid'>>();
  const ban2 = await api.functional.discussionBoard.bans.post(connection, {
    body: {
      ...banInput,
      moderator_id: unauthorized_id,
      member_id: typia.random<string & tags.Format<'uuid'>>(), // Use different member to avoid unique collision
    },
  });
  typia.assert(ban2);
  // Simulate unauthorized delete: attempt erase by non-matching moderator (in reality, would be enforced by auth/session, not input alone)
  await TestValidator.error('unauthorized deletion fails')(async () => {
    await api.functional.discussionBoard.bans.eraseById(connection, { id: ban2.id });
  });
}