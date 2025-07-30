import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that a newly registered discussion board member (with no activity)
 * receives an empty paginated notification list.
 *
 * This test ensures that when a user registers on the board, but has not yet
 * triggered any notification-generating actions (such as replies, mentions, or
 * system events), the notification index endpoint returns a paginated response
 * with an empty data array and appropriate pagination metadata (zero
 * records/pages).
 *
 * Steps:
 *
 * 1. Register a new user in the discussion board system using the admin/member
 *    creation endpoint.
 * 2. As this member, access the notification index endpoint.
 * 3. Assert that the data array in the paginated result is empty.
 * 4. Assert that pagination meta (records, pages) are zero, and no errors or
 *    extraneous records are present.
 */
export async function test_api_discussionBoard_test_list_notifications_no_results_for_new_user(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: `user_${typia.random<string & tags.Format<"uuid">>()}@e2e.local`,
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: memberInput,
    },
  );
  typia.assert(member);

  // 2. Access notifications index (assuming connection context is for this member)
  const notifications =
    await api.functional.discussionBoard.member.notifications.index(connection);
  typia.assert(notifications);

  // 3. Validate notification list is empty and pagination reports zeroes
  TestValidator.equals("empty notifications array")(notifications.data)([]);
  TestValidator.equals("notifications pagination.records")(
    notifications.pagination.records,
  )(0);
  TestValidator.equals("notifications pagination.pages")(
    notifications.pagination.pages,
  )(0);
}
