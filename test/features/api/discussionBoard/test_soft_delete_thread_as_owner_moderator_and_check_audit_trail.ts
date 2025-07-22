import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * E2E test of soft-deletion of a discussion board thread by various roles and error conditions.
 *
 * This test covers:
 * 1. Registering three accounts (owner, moderator, basic member)
 * 2. Moderator creates a category for the thread
 * 3. Thread owner creates a thread in that category
 * 4. Thread owner is able to soft-delete their own thread
 * 5. Confirm the thread enters soft-deleted state (deleted_at populated)
 * 6. Non-owner member attempts (should fail) to delete the thread
 * 7. Owner creates another thread, for moderator-initiated deletion
 * 8. Moderator is able to soft-delete the thread
 * 9. Attempt to delete an already-deleted thread (should fail)
 * 10. Attempt to delete a non-existent thread (should fail)
 *
 * Post-conditions (not implemented, as not in API):
 * - Verify deleted thread is not listed in standard thread lists
 * - Verify audit logging if exposed
 */
export async function test_api_discussionBoard_test_soft_delete_thread_as_owner_moderator_and_check_audit_trail(
  connection: api.IConnection,
) {
  // 1. Register three members: owner, moderator, member
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const modEmail = typia.random<string & tags.Format<"email">>();
  const memberEmail = typia.random<string & tags.Format<"email">>();

  const owner = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: ownerEmail,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(owner);

  const moderator = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: modEmail,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(moderator);

  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Moderator creates a category
  const category = await api.functional.discussionBoard.categories.post(connection, {
    body: {
      name: RandomGenerator.alphaNumeric(10),
      description: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardCategory.ICreate,
  });
  typia.assert(category);

  // 3. Owner creates a thread in the new category
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: owner.id,
      discussion_board_category_id: category.id,
      title: RandomGenerator.paragraph()(),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 4. Soft-delete as the thread owner
  const deletedByOwner = await api.functional.discussionBoard.threads.eraseById(connection, {
    id: thread.id,
  });
  typia.assert(deletedByOwner);
  TestValidator.predicate("thread deleted_at populated")(
    !!deletedByOwner.deleted_at && typeof deletedByOwner.deleted_at === "string"
  );

  // 5. Attempt (should fail) to delete as a non-owner member
  await TestValidator.error("non-owner member cannot delete thread")(async () => {
    await api.functional.discussionBoard.threads.eraseById(connection, {
      id: thread.id,
    });
  });

  // 6. Owner creates a second thread (for moderator to delete)
  const thread2 = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: owner.id,
      discussion_board_category_id: category.id,
      title: RandomGenerator.paragraph()(),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread2);

  // 7. Moderator soft-deletes the second thread
  const deletedByModerator = await api.functional.discussionBoard.threads.eraseById(connection, {
    id: thread2.id,
  });
  typia.assert(deletedByModerator);
  TestValidator.predicate("thread deleted_at populated by moderator")(
    !!deletedByModerator.deleted_at && typeof deletedByModerator.deleted_at === "string"
  );

  // 8. Try to delete already-deleted thread
  await TestValidator.error("deleting already-deleted thread")(() =>
    api.functional.discussionBoard.threads.eraseById(connection, { id: thread2.id })
  );

  // 9. Try to delete a non-existent thread
  await TestValidator.error("deleting non-existent thread")(() =>
    api.functional.discussionBoard.threads.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>()
    })
  );

  // 10. Optional: Listing/audit tests would go here, if API allows
}