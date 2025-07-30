import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test updating audit or registration fields of a discussion board member as an
 * admin.
 *
 * This test ensures that an administrator can successfully update only allowed
 * fields on a board member:
 *
 * - Suspension status (`suspended_at`)
 * - Join time (`joined_at`)
 * - External user identifier (`user_identifier`)
 *
 * The workflow:
 *
 * 1. Create a test member via the admin create endpoint
 * 2. As admin, issue an update to suspend the member
 * 3. Confirm suspension field is updated, others remain unchanged
 * 4. Update the member's join time and user identifier
 * 5. Confirm both fields are updated, prior suspension remains
 * 6. Clear the suspension field (i.e., unsuspend/reactivate the member)
 * 7. Confirm field is null and other fields remain accurate
 */
export async function test_api_discussionBoard_admin_members_test_update_member_audit_fields_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a valid board member via dependency
  const initialUserIdentifier: string = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const joinTime: string = new Date().toISOString();

  const createdMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: initialUserIdentifier,
        joined_at: joinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(createdMember);

  // 2. Issue a PUT update: suspend the member
  const suspendTime: string = new Date(Date.now() + 10000).toISOString();
  const updatedSuspended =
    await api.functional.discussionBoard.admin.members.update(connection, {
      memberId: createdMember.id,
      body: {
        suspended_at: suspendTime,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedSuspended);
  TestValidator.equals("id unchanged")(updatedSuspended.id)(createdMember.id);
  TestValidator.equals("user_identifier unchanged")(
    updatedSuspended.user_identifier,
  )(createdMember.user_identifier);
  TestValidator.equals("joined_at unchanged")(updatedSuspended.joined_at)(
    createdMember.joined_at,
  );
  TestValidator.equals("suspended_at updated")(updatedSuspended.suspended_at)(
    suspendTime,
  );

  // 3. Update joined_at and user_identifier together
  const newJoinTime = new Date(Date.now() + 100000).toISOString();
  const newUserIdentifier: string = `updated_${RandomGenerator.alphaNumeric(8)}`;
  const updatedJoinAndIdentifier =
    await api.functional.discussionBoard.admin.members.update(connection, {
      memberId: createdMember.id,
      body: {
        joined_at: newJoinTime,
        user_identifier: newUserIdentifier,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedJoinAndIdentifier);
  TestValidator.equals("id unchanged after join/id update")(
    updatedJoinAndIdentifier.id,
  )(createdMember.id);
  TestValidator.equals("joined_at updated")(updatedJoinAndIdentifier.joined_at)(
    newJoinTime,
  );
  TestValidator.equals("user_identifier updated")(
    updatedJoinAndIdentifier.user_identifier,
  )(newUserIdentifier);
  TestValidator.equals("suspended_at retained")(
    updatedJoinAndIdentifier.suspended_at,
  )(suspendTime);

  // 4. Clear the suspension status (unsuspend/reactivate)
  const clearedSuspension =
    await api.functional.discussionBoard.admin.members.update(connection, {
      memberId: createdMember.id,
      body: {
        suspended_at: null,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(clearedSuspension);
  TestValidator.equals("id retained")(clearedSuspension.id)(createdMember.id);
  TestValidator.equals("joined_at retained")(clearedSuspension.joined_at)(
    newJoinTime,
  );
  TestValidator.equals("user_identifier retained")(
    clearedSuspension.user_identifier,
  )(newUserIdentifier);
  TestValidator.equals("suspended_at cleared")(clearedSuspension.suspended_at)(
    null,
  );
}
