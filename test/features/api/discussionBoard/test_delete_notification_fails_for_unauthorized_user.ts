import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validates that unauthorized users cannot delete notifications not addressed to them and that only the recipient, an admin, or a moderator can do so.
 *
 * Business context:
 * - Ensures discussion board notification deletion security: Only the notification recipient, or privileged roles (admin/mod), may delete specific notifications.
 *
 * Steps:
 * 1. Register three users: User A (notification recipient), User B (unauthorized/cannot delete others' notifications), and Admin (has privilege).
 * 2. Create a notification addressed to User A (using Admin).
 * 3. Attempt deletion as User B (should fail with forbidden error).
 * 4. Attempt deletion as User A (should succeed).
 * 5. Create another notification (for User A), delete as Admin (should succeed).
 */
export async function test_api_discussionBoard_test_delete_notification_fails_for_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Register User A (recipient)
  const userA_email = typia.random<string & tags.Format<"email">>();
  const userA: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: userA_email,
        hashed_password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(userA);

  // 2. Register User B (unauthorized user)
  const userB_email = typia.random<string & tags.Format<"email">>();
  const userB: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: userB_email,
        hashed_password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(userB);

  // 3. Register Admin (simulate as admin; assume test infra provides role on join by special email format)
  const admin_email = `admin+${RandomGenerator.alphabets(5)}@test.local`;
  const admin: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(
    connection,
    {
      body: {
        username: "admin_" + RandomGenerator.alphabets(6),
        email: admin_email,
        hashed_password: RandomGenerator.alphaNumeric(14),
        display_name: "AdminTestUser",
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(admin);

  // 4. [Admin] Create a notification for User A
  // (Assume connection is privileged or test infra auto-grants permissions for admin email)
  const notification: IDiscussionBoardNotification = await api.functional.discussionBoard.notifications.post(
    connection,
    {
      body: {
        recipient_member_id: userA.id,
        trigger_actor_id: admin.id,
        type: "moderation",
        content_preview: "Board rule notice.",
        url: "/notification/test",
      } satisfies IDiscussionBoardNotification.ICreate,
    },
  );
  typia.assert(notification);

  // --- Unauthorized delete: User B tries to delete User A's notification ---
  // (Assume switching current user to User B by replacing Authorization-header)
  // [Implementation note: In test env, simulate user context switch by modifying connection.headers if supported]
  // Here, since no login function, assume infra uses header/email
  const userB_connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      "X-Test-User": userB.email,
    },
  };
  await TestValidator.error("User B cannot delete User A's notification")(
    async () => {
      await api.functional.discussionBoard.notifications.eraseById(userB_connection, {
        id: notification.id,
      });
    },
  );

  // --- Allowed: User A deletes own notification ---
  const userA_connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      "X-Test-User": userA.email,
    },
  };
  const deletedByOwner: IDiscussionBoardNotification = await api.functional.discussionBoard.notifications.eraseById(
    userA_connection,
    {
      id: notification.id,
    },
  );
  typia.assert(deletedByOwner);

  // 5. [Setup] Create a new notification for User A
  const secondNotification: IDiscussionBoardNotification = await api.functional.discussionBoard.notifications.post(
    connection,
    {
      body: {
        recipient_member_id: userA.id,
        trigger_actor_id: admin.id,
        type: "moderation",
        content_preview: "Second test notification.",
        url: "/notification/test2",
      } satisfies IDiscussionBoardNotification.ICreate,
    },
  );
  typia.assert(secondNotification);

  // --- Allowed: Admin deletes User A's notification ---
  const admin_connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      "X-Test-User": admin.email,
    },
  };
  const deletedByAdmin: IDiscussionBoardNotification = await api.functional.discussionBoard.notifications.eraseById(
    admin_connection,
    {
      id: secondNotification.id,
    },
  );
  typia.assert(deletedByAdmin);
}