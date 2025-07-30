import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * Test that a moderator can successfully access the activity logs via the
 * moderator endpoint.
 *
 * This test proceeds as follows:
 *
 * 1. Create a moderator record (requires admin privilege).
 * 2. Log two recent activity events: one as a moderator, one as a non-moderator
 *    (e.g., member).
 * 3. Retrieve the activity logs through the moderator endpoint (simulating
 *    moderator access).
 * 4. Verify the logs are returned, asserted for expected structure and type.
 * 5. Confirm that among results, activity logs for both the moderator and the
 *    member exist and their metadata fields (actor_id, actor_type, action_type,
 *    action_timestamp, etc.) are populated.
 */
export async function test_api_discussionBoard_test_list_activity_logs_as_moderator_success(
  connection: api.IConnection,
) {
  // 1. Create moderator record via admin API
  const moderatorUserIdentifier = typia.random<string>();
  const nowTimestamp = new Date().toISOString();
  const moderatorCreation =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserIdentifier,
        granted_at: nowTimestamp,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorCreation);

  // 2. Log recent activities as admin, one as moderator and one as member
  // a. Activity as moderator
  const moderatorActivity =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: {
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "moderator",
        action_type: "moderation_action",
        action_timestamp: nowTimestamp,
        topic_id: null,
        thread_id: null,
        post_id: null,
        ip_address: "127.0.0.1",
        user_agent: "moderator-test-agent",
        metadata_json: '{"test":true}',
      } satisfies IDiscussionBoardActivityLog.ICreate,
    });
  typia.assert(moderatorActivity);

  // b. Activity as non-moderator (member)
  const memberActivity =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: {
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "member",
        action_type: "post_created",
        action_timestamp: nowTimestamp,
        topic_id: null,
        thread_id: null,
        post_id: null,
        ip_address: "127.0.0.2",
        user_agent: "member-test-agent",
        metadata_json: '{"test":true}',
      } satisfies IDiscussionBoardActivityLog.ICreate,
    });
  typia.assert(memberActivity);

  // 3. Retrieve logs through the moderator endpoint
  const logsPage =
    await api.functional.discussionBoard.moderator.activityLogs.index(
      connection,
    );
  typia.assert(logsPage);

  // 4. Validate the logs page data and ensure moderator and member activities exist and metadata is present
  const logActorTypes = logsPage.data.map((log) => log.actor_type);
  TestValidator.predicate("logs include moderator activity")(
    logActorTypes.includes("moderator"),
  );
  TestValidator.predicate("logs include member activity")(
    logActorTypes.includes("member"),
  );
  for (const log of logsPage.data) {
    TestValidator.predicate("actor id present")(
      typeof log.actor_id === "string" && !!log.actor_id,
    );
    TestValidator.predicate("actor type present")(
      typeof log.actor_type === "string" && !!log.actor_type,
    );
    TestValidator.predicate("action type present")(
      typeof log.action_type === "string" && !!log.action_type,
    );
    TestValidator.predicate("action timestamp present")(
      typeof log.action_timestamp === "string" && !!log.action_timestamp,
    );
  }
}
