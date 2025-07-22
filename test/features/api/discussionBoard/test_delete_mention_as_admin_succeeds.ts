import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * Validate administrator's ability to soft-delete a mention by its ID (discussion_board_mentions table).
 *
 * This test ensures that an admin can delete a mention (soft delete), using only the APIs and DTOs provided.
 * Steps:
 * 1. Create two members: one will be assigned as admin, the other is the mentioned user.
 * 2. Assign admin privileges to one member with the admin API.
 * 3. As admin, create a mention targeting the other member.
 * 4. Admin deletes the mention using its ID (soft-delete, per business logic).
 * 5. Assert that no errors occur and that all types are correct.
 *
 * Note: Direct validation of audit logs and post-deletion absence in mention listings is not implemented
 * because no such endpoints are present in the provided interface. This test focuses on success path,
 * soft-deletion procedure, and type contract integrity for the privileged workflow.
 */
export async function test_api_discussionBoard_test_delete_mention_as_admin_succeeds(
  connection: api.IConnection,
) {
  // 1. Create two members: one for admin, one to mention
  const adminMemberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const targetMemberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const adminMember = await api.functional.discussionBoard.members.post(connection, { body: adminMemberInput });
  typia.assert(adminMember);
  const targetMember = await api.functional.discussionBoard.members.post(connection, { body: targetMemberInput });
  typia.assert(targetMember);

  // 2. Assign admin privileges to admin member
  const adminAssignment = await api.functional.discussionBoard.administrators.post(connection, {
    body: { member_id: adminMember.id },
  });
  typia.assert(adminAssignment);

  // 3. As admin, create a mention targeting the other member
  const mentionInput: IDiscussionBoardMention.ICreate = {
    mentioned_member_id: targetMember.id,
    content_type: "post",
    content_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const mention = await api.functional.discussionBoard.mentions.post(connection, { body: mentionInput });
  typia.assert(mention);

  // 4. Admin deletes (soft-deletes) the mention by ID
  await api.functional.discussionBoard.mentions.eraseById(connection, {
    id: mention.id,
  });
  // No way to validate exclusion from queries or audit log via API, so assert success of prior steps only.
}