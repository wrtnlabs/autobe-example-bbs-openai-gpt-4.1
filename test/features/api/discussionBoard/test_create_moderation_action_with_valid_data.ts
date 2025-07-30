import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test creating a moderation action record by an authorized moderator (not
 * admin), ensuring data integrity and reference correctness.
 *
 * This test simulates the common moderation workflow in which a moderator
 * addresses a report, logging the resolution action for audit and compliance.
 * It synthesizes all required data relationships as described by the business
 * scenario and validates persistence and referencing of the created moderation
 * action.
 *
 * Workflow steps:
 *
 * 1. Create a moderator assignment for a given user (to act as the moderation
 *    actor)
 * 2. Create a content report for a post or comment that can be resolved
 * 3. Create a moderation action referencing the above moderator as actor and the
 *    report as target
 *
 *    - Provide all required action details: action type, details/evidence, and valid
 *         reference fields
 * 4. Assert that the action record is created
 * 5. Validate associations in the response: actor_moderator_id, report_id,
 *    action_type, action_details, created_at are present and accurate
 * 6. Timestamps and UUIDs should match request relationships and general format
 *    constraints
 */
export async function test_api_discussionBoard_test_create_moderation_action_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create moderator assignment with a unique user_identifier
  const moderatorUserId = typia.random<string>();
  const moderatorAssignment =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserId,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderatorAssignment);

  // 2. Create a report for a post (randomly generated post UUID, valid reporter UUID)
  const reporterId = typia.random<string & tags.Format<"uuid">>();
  const reportedPostId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.discussionBoard.admin.reports.create(
    connection,
    {
      body: {
        reporter_id: reporterId,
        content_type: "post",
        reported_post_id: reportedPostId,
        reported_comment_id: null,
        reason: "Spam or irrelevant content",
      },
    },
  );
  typia.assert(report);

  // 3. Create a moderation action (action_type: 'delete', action_details sample evidence, linked actor/report)
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          actor_moderator_id: moderatorAssignment.id,
          actor_admin_id: null,
          post_id: report.reported_post_id ?? null,
          comment_id: null,
          report_id: report.id,
          action_type: "delete",
          action_details:
            "Content removed for repeated spam. See evidence: screenshot123.png",
        },
      },
    );
  typia.assert(moderationAction);

  // 4. Assert key fields are accurate
  TestValidator.equals("moderation action actor moderator id")(
    moderationAction.actor_moderator_id,
  )(moderatorAssignment.id);
  TestValidator.equals("moderation action report id")(
    moderationAction.report_id,
  )(report.id);
  TestValidator.equals("moderation action action_type")(
    moderationAction.action_type,
  )("delete");
  TestValidator.equals("moderation action action_details")(
    moderationAction.action_details,
  )("Content removed for repeated spam. See evidence: screenshot123.png");
  TestValidator.equals("moderation action post_id")(moderationAction.post_id)(
    report.reported_post_id,
  );
  TestValidator.equals("moderation action comment_id")(
    moderationAction.comment_id,
  )(null);
  TestValidator.predicate("created_at is present")(
    typeof moderationAction.created_at === "string" &&
      moderationAction.created_at.length > 0,
  );
  TestValidator.predicate("id is uuid")(
    typeof moderationAction.id === "string" && moderationAction.id.length > 0,
  );
}
