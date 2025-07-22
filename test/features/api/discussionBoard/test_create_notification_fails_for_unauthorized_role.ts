import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that only administrators can create notifications via the API.
 *
 * Ensures that non-admin users, such as regular members, are forbidden from creating manual/system notifications via the POST /discussionBoard/notifications endpoint. Only administrators should be able to trigger this API action. The test registers a regular user, then attempts to create a notification as this user, expecting a runtime authorization error.
 *
 * Steps:
 * 1. Register a new member (regular user)
 * 2. Attempt to create a manual/system notification as this user
 * 3. Assert that the operation fails with an authorization/business logic error (runtime)
 *
 * Only available APIs and DTOs are used. Test does not cover compile-time validation failures, only runtime business errors.
 */
export async function test_api_discussionBoard_test_create_notification_fails_for_unauthorized_role(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member (non-admin)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Attempt to create a notification as this member (should be forbidden)
  await TestValidator.error("Non-admin cannot create notification")(
    async () => {
      await api.functional.discussionBoard.notifications.post(connection, {
        body: {
          recipient_member_id: member.id,
          trigger_actor_id: null,
          type: "manual_test",
          content_preview: "This should fail",
          url: "https://test.local/discussion/1",
        } satisfies IDiscussionBoardNotification.ICreate,
      });
    },
  );
}