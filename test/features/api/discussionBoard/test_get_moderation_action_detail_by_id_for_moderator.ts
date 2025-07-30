import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate retrieving a specific moderation action detail by ID for a
 * moderator.
 *
 * This test ensures that a moderator, after creating a moderation action on a
 * post, can retrieve the full details of that moderation action using its
 * unique moderationActionId.
 *
 * Business scenario:
 *
 * - Moderators must be able to review audit and compliance actions after taking
 *   moderation steps.
 * - Full record retrieval enables subsequent investigation, dispute, or reporting
 *   workflows.
 *
 * Steps performed:
 *
 * 1. Create a new moderation action as a moderator (setup step to obtain ID)
 * 2. Retrieve moderation action by the returned ID via the GET endpoint
 * 3. Assert that required and optionally-set fields match exactly between create
 *    and get responses
 * 4. Confirm optional/unused fields (admin, comment, report) are unset
 * 5. Validate the presence and type of the required created_at timestamp
 * 6. Attempt to fetch a non-existent moderationActionId and expect an error
 * 7. Attempt to fetch using an invalid UUID format and expect an error
 * 8. Confirm that authorization restriction for moderator/admin is assumed by test
 *    context
 */
export async function test_api_discussionBoard_test_get_moderation_action_detail_by_id_for_moderator(
  connection: api.IConnection,
) {
  // 1. Create a moderation action as a moderator.
  const createBody: IDiscussionBoardModerationAction.ICreate = {
    actor_moderator_id: typia.random<string & tags.Format<"uuid">>(),
    post_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "delete",
    action_details: "Automated test moderation action.",
  };
  const created: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 2. Retrieve by moderationActionId
  const fetched: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.at(
      connection,
      {
        moderationActionId: created.id,
      },
    );
  typia.assert(fetched);

  // 3. Assert required field equality
  TestValidator.equals("moderationActionId matches")(fetched.id)(created.id);
  TestValidator.equals("actor_moderator_id")(fetched.actor_moderator_id)(
    createBody.actor_moderator_id,
  );
  TestValidator.equals("action_type")(fetched.action_type)(
    createBody.action_type,
  );
  TestValidator.equals("action_details")(fetched.action_details)(
    createBody.action_details,
  );
  TestValidator.equals("post_id")(fetched.post_id)(createBody.post_id);

  // 4. Confirm optional fields remain unset (undefined or null as appropriate)
  TestValidator.equals("actor_admin_id is unset")(
    "actor_admin_id" in fetched ? fetched.actor_admin_id : undefined,
  )(undefined);
  TestValidator.equals("comment_id is unset")(
    "comment_id" in fetched ? fetched.comment_id : undefined,
  )(undefined);
  TestValidator.equals("report_id is unset")(
    "report_id" in fetched ? fetched.report_id : undefined,
  )(undefined);

  // 5. Validate presence and apparent type of created_at
  TestValidator.predicate("created_at exists and string format")(
    typeof fetched.created_at === "string" && !!fetched.created_at,
  );

  // 6. Negative: non-existent moderationActionId
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 for non-existent moderation action")(
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.at(
        connection,
        {
          moderationActionId: nonexistentId,
        },
      );
    },
  );

  // 7. Negative: invalid UUID format
  await TestValidator.error("400 for invalid UUID format")(async () => {
    await api.functional.discussionBoard.moderator.moderationActions.at(
      connection,
      {
        moderationActionId: "invalid-uuid-format" as any,
      },
    );
  });
  // 8. Authorization restriction for moderator/admin is presumed (test context simulates privileged role).
}
