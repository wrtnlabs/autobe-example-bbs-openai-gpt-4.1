import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that notification creation fails when required fields are missing.
 *
 * This test ensures that the notification POST endpoint enforces business-level
 * validation on required fields as defined by the domain model, specifically
 * "recipient_member_id" and "type" in the notification creation payload. The
 * test simulates an administrator attempting to create a notification, omitting
 * these required fields to check that the system returns validation errors and
 * blocks notification creation. This is critical for data integrity and for
 * preventing incomplete or unauthorized notification insertion.
 *
 * Process:
 * 1. Create an admin member (as sender/trigger_actor).
 * 2. Attempt to create a notification (POST /discussionBoard/notifications) without recipient_member_id or type.
 * 3. Assert that the system throws validation errors; no notification is created.
 */
export async function test_api_discussionBoard_test_create_notification_fails_for_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Create admin member (for notification sender context)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: adminEmail,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(admin);

  // 2. Attempt to create notification missing required fields
  // Missing both recipient_member_id (required) and type (required)
  await TestValidator.error("missing required fields must fail for notification POST")(() =>
    api.functional.discussionBoard.notifications.post(connection, {
      body: {
        // recipient_member_id: intentionally omitted
        // type: intentionally omitted
        url: "https://example.com/resource",
      } as any, // TypeScript will not allow at compile; in actual test only runtime-possible missing
    })
  );
}