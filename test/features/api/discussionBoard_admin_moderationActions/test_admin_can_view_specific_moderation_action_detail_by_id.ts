import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate retrieval of a specific moderation action by ID as an admin user.
 *
 * This test ensures that an admin can see all details for a moderation action
 * they create, and that all fields are accurately returned by the GET endpoint.
 * It also covers error cases for not found and forbidden.
 *
 * Steps:
 *
 * 1. As an admin, create a new moderation action; save the returned id.
 * 2. Retrieve that moderation action by id using the GET endpoint.
 * 3. Validate that all key fields match the created data.
 * 4. Attempt to retrieve a non-existent moderation action (expect error).
 * 5. (If SDK allows) Try with insufficient privileges (expect forbidden;
 *    implementation left as comment if no such API).
 */
export async function test_api_discussionBoard_admin_moderationActions_test_admin_can_view_specific_moderation_action_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new moderation action as admin
  const actionCreateInput: IDiscussionBoardModerationAction.ICreate = {
    actor_admin_id: typia.random<string & tags.Format<"uuid">>(),
    actor_moderator_id: null,
    post_id: typia.random<string & tags.Format<"uuid">>(),
    comment_id: null,
    report_id: null,
    action_type: "delete",
    action_details: "Test removal for admin test.",
  };
  const createdAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      { body: actionCreateInput },
    );
  typia.assert(createdAction);

  // 2. Retrieve moderation action by id and verify all fields
  const retrieved =
    await api.functional.discussionBoard.admin.moderationActions.at(
      connection,
      { moderationActionId: createdAction.id },
    );
  typia.assert(retrieved);
  TestValidator.equals("moderationAction id")(retrieved.id)(createdAction.id);
  TestValidator.equals("action_type")(retrieved.action_type)(
    actionCreateInput.action_type,
  );
  TestValidator.equals("actor_admin_id")(retrieved.actor_admin_id)(
    actionCreateInput.actor_admin_id,
  );
  TestValidator.equals("actor_moderator_id")(retrieved.actor_moderator_id)(
    actionCreateInput.actor_moderator_id,
  );
  TestValidator.equals("post_id")(retrieved.post_id)(actionCreateInput.post_id);
  TestValidator.equals("comment_id")(retrieved.comment_id)(null);
  TestValidator.equals("report_id")(retrieved.report_id)(null);
  TestValidator.equals("action_details")(retrieved.action_details)(
    actionCreateInput.action_details,
  );

  // 3. Attempt to fetch a non-existent moderation action (use random UUID)
  await TestValidator.error("not found for non-existent moderationActionId")(
    () =>
      api.functional.discussionBoard.admin.moderationActions.at(connection, {
        moderationActionId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );

  // 4. Forbidden access scenario: If you have an API for non-admin/non-auth connection,
  //    you can attempt the call contextually here and expect an error. Since not provided, omitted.
}
