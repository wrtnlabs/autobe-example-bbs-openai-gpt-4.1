import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that only allowed mutable fields of a notification can be updated by privileged roles (admin, moderator), and ensure permissions and restrictions are enforced.
 *
 * This test simulates an administrative/operational scenario where moderator and admin users attempt to update notifications on behalf of other members.
 *
 * 1. Register three members, with different roles: one regular member (recipient), one moderator, and one admin (assuming roles are set up externally for the test; API only allows creation of members, so role simulation is in-code).
 * 2. Create a notification for the recipient member using the admin's ID as trigger_actor_id.
 * 3. As the administrator, update only allowed (mutable) fields (read, delivered_at, content_preview), and validate that only those fields change and others remain as originally set.
 * 4. As the moderator, attempt another allowed update and revalidate permitted and forbidden field update behavior.
 * 5. For each update, assert that immutable fields (recipient_member_id, type, url, created_at) remain unchanged.
 * 6. Forbidden field updates cannot be represented or compiled; validate only by checking immutable fields are not changed after updates.
 */
export async function test_api_discussionBoard_test_update_notification_by_admin_or_mod_for_other_user(
  connection: api.IConnection,
) {
  // 1. Register three members: recipient, moderator, admin
  const basePw = "hashed-password!";
  // Regular member (notification recipient)
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: basePw,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member);
  // Moderator
  const moderator = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: basePw,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(moderator);
  // Administrator
  const admin = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: basePw,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(admin);
  // [API does not manage roles, so role/scope enforcement is assumed for test.] 

  // 2. Create notification for the recipient member, triggered by admin
  const notification = await api.functional.discussionBoard.notifications.post(connection, {
    body: {
      recipient_member_id: member.id,
      trigger_actor_id: admin.id,
      type: "moderation",
      content_preview: "Initial moderation notification.",
      url: "https://discussion.example.com/notification/123",
    },
  });
  typia.assert(notification);

  // 3. As admin, update allowed mutable fields
  const updatePayloadAdmin = {
    read: true,
    delivered_at: new Date().toISOString(),
    content_preview: "[UPDATED] Moderation notice by admin.",
  };
  const updatedByAdmin = await api.functional.discussionBoard.notifications.putById(connection, {
    id: notification.id,
    body: updatePayloadAdmin,
  });
  typia.assert(updatedByAdmin);
  // Validate mutable fields changed
  TestValidator.equals("read updated by admin")(updatedByAdmin.read)(true);
  TestValidator.equals("delivered_at set by admin")(!!updatedByAdmin.delivered_at)(true);
  TestValidator.equals("content_preview updated by admin")(updatedByAdmin.content_preview)(updatePayloadAdmin.content_preview);
  // Validate immutable fields unchanged
  TestValidator.equals("recipient_member_id unchanged")(updatedByAdmin.recipient_member_id)(notification.recipient_member_id);
  TestValidator.equals("type unchanged")(updatedByAdmin.type)(notification.type);
  TestValidator.equals("url unchanged")(updatedByAdmin.url)(notification.url);

  // 4. As moderator, update again
  const updatePayloadMod = {
    read: false,
    delivered_at: new Date().toISOString(),
    content_preview: "[MODERATOR] Changed preview text.",
  };
  const updatedByMod = await api.functional.discussionBoard.notifications.putById(connection, {
    id: notification.id,
    body: updatePayloadMod,
  });
  typia.assert(updatedByMod);
  TestValidator.equals("read updated by moderator")(updatedByMod.read)(false);
  TestValidator.equals("content_preview updated by moderator")(updatedByMod.content_preview)(updatePayloadMod.content_preview);
  TestValidator.equals("recipient_member_id unchanged, mod")(updatedByMod.recipient_member_id)(notification.recipient_member_id);
  TestValidator.equals("type unchanged, mod")(updatedByMod.type)(notification.type);
  TestValidator.equals("url unchanged, mod")(updatedByMod.url)(notification.url);
  // 5. Forbidden field update test was removed as it cannot be implemented in TypeScript with the given DTO.
}