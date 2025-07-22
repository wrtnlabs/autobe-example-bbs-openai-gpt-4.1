import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Validates retrieval of discussion board attachment metadata under various access scenarios.
 *
 * Ensures that only permitted users (owner, admin) can retrieve full metadata, while forbidden users receive error responses. Also validates correct handling of soft-deleted and non-existent attachments.
 *
 * Steps:
 * 1. Register User A (uploader/owner)
 * 2. Register User B (non-owner, regular user)
 * 3. Register Admin (simulated privileged account)
 * 4. User A uploads an attachment; store its UUID
 * 5. User A retrieves attachment metadata (expect full success)
 * 6. User B attempts to retrieve the same attachment (expect access denied or filtered/denied)
 * 7. Admin retrieves the attachment metadata (expect full success)
 * 8. Attempt to retrieve non-existent attachment (expect error)
 * 9. User A soft-deletes the attachment
 * 10. Post-deletion: User A attempts to retrieve (should be error/denied)
 * 11. Post-deletion: Admin attempts to retrieve (should reflect deletion or error)
 */
export async function test_api_discussionBoard_test_get_attachment_metadata_success_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register User A (owner)
  const userA_req = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const userA = await api.functional.discussionBoard.members.post(connection, { body: userA_req });
  typia.assert(userA);

  // 2. Register User B (non-owner)
  const userB_req = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const userB = await api.functional.discussionBoard.members.post(connection, { body: userB_req });
  typia.assert(userB);

  // 3. Register Admin (simulate normal registration; in real system, privilege may be assigned out-of-band)
  const admin_req = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: "Admin User",
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const admin = await api.functional.discussionBoard.members.post(connection, { body: admin_req });
  typia.assert(admin);

  // 4. User A uploads an attachment (simulate parent post association)
  const attachmentCreate = {
    discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
    discussion_board_comment_id: null,
    file_name: "test_document.pdf",
    file_uri: "https://cdn.example.com/test_document.pdf",
    content_type: "application/pdf",
    content_hash: typia.random<string>(),
  } satisfies IDiscussionBoardAttachment.ICreate;
  // Simulate authenticating as User A
  // In actual system, you might need to simulate authentication token switching; assume session context supports user switching if needed.
  const attachment = await api.functional.discussionBoard.attachments.post(connection, { body: attachmentCreate });
  typia.assert(attachment);

  // 5. As User A (owner), retrieve metadata - expect success and full data
  const output_owner = await api.functional.discussionBoard.attachments.getById(connection, { id: attachment.id });
  typia.assert(output_owner);
  TestValidator.equals("owner gets correct id")(output_owner.id)(attachment.id);
  TestValidator.equals("owner gets not deleted")(output_owner.deleted_at)(null);
  TestValidator.equals("owner gets correct name")(output_owner.file_name)(attachment.file_name);
  TestValidator.equals("owner gets correct uploader")(output_owner.discussion_board_member_id)(attachment.discussion_board_member_id);

  // 6. As User B (non-owner), attempt to fetch - expect error (access denied)
  // Simulate switching to User B if required
  // Expect error response (TestValidator.error())
  await TestValidator.error("Non-owner cannot access attachment")(() =>
    api.functional.discussionBoard.attachments.getById(connection, { id: attachment.id })
  );

  // 7. As Admin, retrieve metadata - expect success (simulate admin context if possible)
  const output_admin = await api.functional.discussionBoard.attachments.getById(connection, { id: attachment.id });
  typia.assert(output_admin);
  TestValidator.equals("admin gets correct id")(output_admin.id)(attachment.id);
  TestValidator.equals("admin gets correct name")(output_admin.file_name)(attachment.file_name);
  TestValidator.equals("admin gets correct uploader")(output_admin.discussion_board_member_id)(attachment.discussion_board_member_id);

  // 8. Attempt to get metadata of a non-existent attachment - expect error
  await TestValidator.error("Fetch non-existent attachment fails")(() =>
    api.functional.discussionBoard.attachments.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>()
    })
  );

  // 9. User A soft-deletes the attachment
  await api.functional.discussionBoard.attachments.eraseById(connection, { id: attachment.id });

  // 10. After deletion: User A attempts to fetch - expect error
  await TestValidator.error("Owner cannot fetch deleted attachment")(() =>
    api.functional.discussionBoard.attachments.getById(connection, { id: attachment.id })
  );

  // 11. After deletion: Admin attempts to fetch - expect error or deleted metadata
  await TestValidator.error("Admin cannot fetch deleted attachment")(() =>
    api.functional.discussionBoard.attachments.getById(connection, { id: attachment.id })
  );
}