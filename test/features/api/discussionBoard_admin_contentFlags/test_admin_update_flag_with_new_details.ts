import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Test admin update to an existing content flag (amend type, add notes, or
 * clear the flag).
 *
 * Validates that an admin can update a moderation flag attached to a comment.
 * This covers typical moderation flows such as changing flag type, adding
 * resolution notes, or marking the flag as resolved/cleared.
 *
 * Business necessity: Ensures compliance and workflow auditability for admin
 * actions on moderation flags so review outcomes and escalations are properly
 * tracked.
 *
 * Steps:
 *
 * 1. Create a comment as the target for flagging (using valid member and post IDs)
 * 2. Create an admin account to authorize flag and update actions
 * 3. Flag the comment with an initial flag (as admin)
 * 4. Update the flag with new moderation values: change type, add details, and set
 *    cleared_at
 * 5. Confirm API response reflects all updates, and the changed flag record
 *    matches expectations
 */
export async function test_api_discussionBoard_admin_contentFlags_test_admin_update_flag_with_new_details(
  connection: api.IConnection,
) {
  // 1. Prepare minimal valid member & post UUIDs for comment
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a comment (to be flagged)
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: "This is a test comment for moderation.",
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Create an admin (required for audit/authorization)
  const adminUserIdentifier = "adminUser_" + RandomGenerator.alphabets(6);
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 4. Create a flag on the comment, acting as admin
  const flag = await api.functional.discussionBoard.admin.contentFlags.create(
    connection,
    {
      body: {
        comment_id: comment.id,
        flagged_by_admin_id: admin.id,
        flag_type: "abuse",
        flag_source: "manual",
        flag_details: "Initial moderation flag on comment",
        post_id: null,
        flagged_by_moderator_id: null,
      } satisfies IDiscussionBoardContentFlag.ICreate,
    },
  );
  typia.assert(flag);

  // 5. Update the flag: change type, add resolution notes, clear the flag
  const resolutionNotes = "Resolved - user warned";
  const newFlagType = "resolved";
  const clearedAt = new Date().toISOString();
  const updatedFlag =
    await api.functional.discussionBoard.admin.contentFlags.update(connection, {
      contentFlagId: flag.id,
      body: {
        flag_type: newFlagType,
        flag_details: resolutionNotes,
        cleared_at: clearedAt,
      } satisfies IDiscussionBoardContentFlag.IUpdate,
    });
  typia.assert(updatedFlag);

  // 6. Validation: check changes applied
  TestValidator.equals("flag_type updated")(updatedFlag.flag_type)(newFlagType);
  TestValidator.equals("details updated")(updatedFlag.flag_details)(
    resolutionNotes,
  );
  TestValidator.equals("cleared_at updated")(updatedFlag.cleared_at)(clearedAt);
  TestValidator.equals("flag id retains")(updatedFlag.id)(flag.id);
  TestValidator.equals("comment id target")(updatedFlag.comment_id)(comment.id);
  TestValidator.equals("admin id audit")(updatedFlag.flagged_by_admin_id)(
    admin.id,
  );
}
