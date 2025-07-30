import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate that a moderator can successfully create a new moderation action and
 * that the endpoint properly enforces permissions, validation, and data
 * integrity.
 *
 * Test covers:
 *
 * - Creating a valid report (target for moderation action)
 * - Creating a valid moderator (actor for moderation)
 * - Success: Moderator creates a new moderation action referencing the report
 * - Error: Creating a moderation action with invalid report reference
 * - Error: Creating a moderation action with missing required fields
 * - Error: Creating a moderation action with invalid action_type value
 * - Error: Non-moderator attempting to create a moderation action (permission
 *   denied)
 *
 * Steps:
 *
 * 1. Create a report (to be used as the moderation target)
 * 2. Create a moderator account (for actor association)
 * 3. As a moderator, create a valid moderation action, validate response
 * 4. Attempt to create moderation actions with invalid inputs and check failure
 * 5. Attempt to create a moderation action as a non-moderator and check that it is
 *    denied
 */
export async function test_api_discussionBoard_test_create_new_moderation_action_by_moderator_with_valid_and_invalid_input(
  connection: api.IConnection,
) {
  // 1. Create a report (to be the referenced moderation target)
  const reporterId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.discussionBoard.moderator.reports.create(
    connection,
    {
      body: {
        reporter_id: reporterId,
        content_type: "post",
        reported_post_id: postId,
        reported_comment_id: null,
        reason: "Test reason for report.",
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  // 2. Create a moderator (who will act as the actor of the moderation)
  const userIdentifier = typia.random<string>();
  const grantTime = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: userIdentifier,
        granted_at: grantTime,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Successfully create a valid moderation action as a moderator
  const moderationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          actor_moderator_id: moderator.id,
          actor_admin_id: null,
          post_id: report.reported_post_id,
          comment_id: null,
          report_id: report.id,
          action_type: "delete",
          action_details: "Moderator action to remove post.",
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  TestValidator.equals("moderation action actor matches moderator")(
    moderationAction.actor_moderator_id,
  )(moderator.id);
  TestValidator.equals("moderation action targets report")(
    moderationAction.report_id,
  )(report.id);

  // 4. Attempt to create moderation action with invalid report reference (should fail)
  await TestValidator.error("invalid report reference should fail")(
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.create(
        connection,
        {
          body: {
            actor_moderator_id: moderator.id,
            actor_admin_id: null,
            post_id: null,
            comment_id: null,
            report_id: typia.random<string & tags.Format<"uuid">>(), // random, non-existent
            action_type: "warn",
            action_details: "Invalid report reference.",
          } satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    },
  );

  // 5. Attempt to create moderation action with missing required fields (should fail)
  await TestValidator.error("missing action_type should fail")(async () => {
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          actor_moderator_id: moderator.id,
          actor_admin_id: null,
          post_id: report.reported_post_id,
          comment_id: null,
          report_id: report.id,
          // action_type is missing
          // action_details is optional
        } as unknown as IDiscussionBoardModerationAction.ICreate,
      },
    );
  });

  // 6. Attempt to create moderation action with invalid action_type value (should fail if business rules restrict allowed action types)
  await TestValidator.error("invalid action_type value should fail")(
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.create(
        connection,
        {
          body: {
            actor_moderator_id: moderator.id,
            actor_admin_id: null,
            post_id: report.reported_post_id,
            comment_id: null,
            report_id: report.id,
            action_type: "not_a_real_action",
            action_details: "Testing invalid action_type value.",
          } satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    },
  );

  // 7. Attempt to create moderation action as a non-moderator (should fail with permission denied)
  const nonModeratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-moderator permission denied")(async () => {
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          actor_moderator_id: nonModeratorId, // not a real moderator
          actor_admin_id: null,
          post_id: report.reported_post_id,
          comment_id: null,
          report_id: report.id,
          action_type: "delete",
          action_details: "Non-moderator test.",
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  });
}
