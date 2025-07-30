import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Test admin privilege to delete a member notification
 *
 * This test verifies that an admin can delete a member's notification from the
 * system. Steps:
 *
 * 1. Create an admin user for this operation (system admin creation)
 * 2. Generate a member recipient UUID (since user/member creation is not provided,
 *    we simulate with a UUID)
 * 3. As admin, create a notification for the simulated member
 * 4. Assert that notification is created and recipient matches
 * 5. As admin, delete the notification by its ID
 * 6. Attempt to fetch the notification as the recipient to ensure it is gone
 *    (expect an error)
 */
export async function test_api_discussionBoard_test_delete_notification_as_admin_for_different_user(
  connection: api.IConnection,
) {
  // 1. Create an admin user (simulate with random user_identifier and current time)
  const adminUserIdentifier: string = RandomGenerator.alphabets(12);
  const adminGrantTime: string = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: adminGrantTime,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Simulate a member by generating a random UUID for recipient_id
  const memberRecipientId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. As admin, create a notification for this member
  const notifCreateInput: IDiscussionBoardNotification.ICreate = {
    recipient_id: memberRecipientId,
    notification_type: "system",
    target_type: "thread",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    message: "Test admin-delete notification",
    delivered_at: new Date().toISOString(),
    delivery_status: "delivered",
  };
  const notification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      {
        body: notifCreateInput,
      },
    );
  typia.assert(notification);
  TestValidator.equals("recipient matches")(notification.recipient_id)(
    memberRecipientId,
  );

  // 4. As admin, delete the notification
  await api.functional.discussionBoard.member.notifications.erase(connection, {
    notificationId: notification.id,
  });

  // 5. Attempt to fetch the notification as the member (should not exist)
  await TestValidator.error("notification should be deleted")(async () => {
    await api.functional.discussionBoard.member.notifications.at(connection, {
      notificationId: notification.id,
    });
  });
}
