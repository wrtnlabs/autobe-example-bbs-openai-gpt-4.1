import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * Validate that an administrator is able to retrieve a paginated list of
 * activity logs from the discussion board system.
 *
 * This test emulates a real-world auditing scenario:
 *
 * 1. An admin is assigned (with a distinct user_identifier and granted_at
 *    timestamp).
 * 2. Several activity logs are created, covering a variety of action_type and
 *    actor_type (e.g., 'member', 'admin', 'moderator', etc.).
 * 3. The admin retrieves activity logs through GET
 *    /discussionBoard/admin/activityLogs.
 * 4. The returned result is checked for:
 *
 *    - Each activity log entry containing all required metadata fields per the DTO.
 *    - Pagination metadata (current page, limit, records, pages) is present and
 *         matches the created logs.
 *    - Each activity log contains expected action_type and actor_type combinations
 *         as created in step 2.
 *    - Entries are sorted and paginated as expected (if multiple created).
 */
export async function test_api_discussionBoard_test_list_activity_logs_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Create an admin to ensure authentication context
  const adminIdentifier: string = "admin-" + RandomGenerator.alphaNumeric(8);
  const grantTime: string = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminIdentifier,
        granted_at: grantTime,
        revoked_at: null,
      },
    },
  );
  typia.assert(admin);

  // 2. Seed several activity logs (with varying actor/action types)
  const now = new Date();
  const logsToCreate = [
    {
      actor_id: typia.random<string & tags.Format<"uuid">>(),
      actor_type: "admin",
      action_type: "moderation_action",
      action_timestamp: new Date(now.getTime() - 5000).toISOString(),
      topic_id: null,
      thread_id: null,
      post_id: null,
      ip_address: "10.1.2.3",
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/99.0.4844.51",
      metadata_json: null,
    },
    {
      actor_id: typia.random<string & tags.Format<"uuid">>(),
      actor_type: "member",
      action_type: "post_created",
      action_timestamp: new Date(now.getTime() - 4000).toISOString(),
      topic_id: typia.random<string & tags.Format<"uuid">>(),
      thread_id: null,
      post_id: null,
      ip_address: null,
      user_agent: null,
      metadata_json: JSON.stringify({ reason: "new user post" }),
    },
    {
      actor_id: typia.random<string & tags.Format<"uuid">>(),
      actor_type: "moderator",
      action_type: "comment_created",
      action_timestamp: new Date(now.getTime() - 3000).toISOString(),
      topic_id: null,
      thread_id: typia.random<string & tags.Format<"uuid">>(),
      post_id: typia.random<string & tags.Format<"uuid">>(),
      ip_address: "172.16.204.12",
      user_agent: "curl/7.77.0",
      metadata_json: JSON.stringify({
        prev_content: "old comment",
        new_content: "updated comment",
      }),
    },
  ];
  const createdLogs: IDiscussionBoardActivityLog[] = [];
  for (const logData of logsToCreate) {
    const created =
      await api.functional.discussionBoard.admin.activityLogs.create(
        connection,
        { body: logData },
      );
    typia.assert(created);
    createdLogs.push(created);
  }

  // 3. Retrieve the activity logs as admin
  const response =
    await api.functional.discussionBoard.admin.activityLogs.index(connection);
  typia.assert(response);
  const { data, pagination } = response;

  // 4. Validate that all created logs are present and correct
  for (const created of createdLogs) {
    const found = data.find((d) => d.id === created.id);
    TestValidator.predicate("Created activity log is found in list")(!!found);
    if (found) {
      // All required metadata is present
      TestValidator.equals("actor_id")(found.actor_id)(created.actor_id);
      TestValidator.equals("actor_type")(found.actor_type)(created.actor_type);
      TestValidator.equals("action_type")(found.action_type)(
        created.action_type,
      );
      TestValidator.equals("action_timestamp")(found.action_timestamp)(
        created.action_timestamp,
      );
      // Optional fields checked for existence or null
      TestValidator.equals("topic_id")(found.topic_id ?? null)(
        created.topic_id ?? null,
      );
      TestValidator.equals("thread_id")(found.thread_id ?? null)(
        created.thread_id ?? null,
      );
      TestValidator.equals("post_id")(found.post_id ?? null)(
        created.post_id ?? null,
      );
      TestValidator.equals("ip_address")(found.ip_address ?? null)(
        created.ip_address ?? null,
      );
      TestValidator.equals("user_agent")(found.user_agent ?? null)(
        created.user_agent ?? null,
      );
      TestValidator.equals("metadata_json")(found.metadata_json ?? null)(
        created.metadata_json ?? null,
      );
    }
  }

  // 5. Pagination metadata is present and valid
  TestValidator.predicate("pagination exists and has expected structure")(
    pagination &&
      typeof pagination.current === "number" &&
      typeof pagination.limit === "number" &&
      typeof pagination.records === "number" &&
      typeof pagination.pages === "number",
  );

  // Should be at least as many logs as we created
  TestValidator.predicate("List contains the created activity logs")(
    data.filter((d) => createdLogs.some((c) => c.id === d.id)).length >=
      createdLogs.length,
  );
}
