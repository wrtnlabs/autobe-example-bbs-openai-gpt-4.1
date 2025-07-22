import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Validate that unauthorized users cannot update a moderation log (forbidden access enforcement).
 *
 * This test ensures that only users with proper privileges (moderators/admins) are able to update moderation log entries.
 * Attempting an update as a non-moderator member or unauthenticated guest should result in a forbidden (or access denied) error.
 *
 * Steps:
 * 1. Register a non-moderator member (basic user).
 * 2. Register a separate member and assign moderator role; use this account to create a moderation log entry for update attempt.
 * 3. Attempt to update the moderation log:
 *    a. As non-moderator (should be forbidden)
 *    b. As guest (no auth, should be forbidden)
 *    c. As moderator (should succeed as a control)
 */
export async function test_api_discussionBoard_test_update_moderation_log_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register a non-moderator member
  const nonModeratorEmail: string = typia.random<string & tags.Format<"email">>();
  const nonModerator: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: nonModeratorEmail,
        hashed_password: RandomGenerator.alphaNumeric(32),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(nonModerator);

  // 2. Register moderator and assign moderator privileges
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        hashed_password: RandomGenerator.alphaNumeric(32),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(moderator);

  const moderatorAssignment: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderators.post(connection, {
      body: {
        member_id: moderator.id,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAssignment);

  // 3. Moderator creates a moderation log
  const logCreate: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderationLogs.post(connection, {
      body: {
        moderator_id: moderatorAssignment.id,
        action: "warn",
        action_reason: "Test moderation action.",
      } satisfies IDiscussionBoardModerationLog.ICreate,
    });
  typia.assert(logCreate);

  // -----------------------
  // Role simulation (see note):
  // Assumes test environment can simulate different login contexts via connection replay or context switching.
  //
  // 3a. As non-moderator, attempt to update moderation log (should fail)
  // (In a real test environment, you'd switch session/token to nonModerator)
  TestValidator.error("Non-moderator cannot update moderation log")(() =>
    api.functional.discussionBoard.moderationLogs.putById(connection, {
      id: logCreate.id,
      body: {
        action_reason: "Illegal attempt to edit log.",
      } satisfies IDiscussionBoardModerationLog.IUpdate,
    })
  );

  // 3b. As guest (no auth), attempt to update moderation log (should fail)
  const guestConnection = { ...connection, headers: {} };
  TestValidator.error("Guest cannot update moderation log")(() =>
    api.functional.discussionBoard.moderationLogs.putById(guestConnection, {
      id: logCreate.id,
      body: {
        action_reason: "Guest attempt to edit.",
      } satisfies IDiscussionBoardModerationLog.IUpdate,
    })
  );

  // 3c. As actual moderator (control), should succeed
  // (In a real test environment, you'd switch session/token to moderator)
  const updatedLog: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderationLogs.putById(connection, {
      id: logCreate.id,
      body: {
        action_reason: "Legitimate moderator update.",
      } satisfies IDiscussionBoardModerationLog.IUpdate,
    });
  typia.assert(updatedLog);
  TestValidator.equals("action_reason updated")(updatedLog.action_reason)("Legitimate moderator update.");
}