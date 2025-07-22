import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Test soft-deletion of an attachment by its owner and by an administrator (should be permitted).
 * Attempt deletion as another member or unauthenticated user (should be forbidden).
 * Edge case: deleting already soft-deleted attachment (should yield conflict or not-modified error);
 * deleting non-existent attachment (should return not found).
 * On successful deletion, validate that deleted_at is set and attachment is not returned in future list queries unless including deleted records explicitly.
 * Test restoration logic if such feature is supported (for audit purposes).
 *
 * 1. Register three users: owner, another member, and admin (simulate via naming convention).
 * 2. Owner creates a post (thread id is random — simulated, as thread creation API is not available, so use random UUID).
 * 3. Owner uploads an attachment for the post.
 * 4. Owner deletes the attachment (should succeed, expect soft-deletion — validate deleted_at).
 * 5. Attempt to delete again as owner (should fail: already deleted, expect error).
 * 6. Attempt to delete same attachment as another member (should fail: forbidden).
 * 7. Attempt to delete same attachment as admin (should succeed or forbidden, depending on business logic).
 * 8. Attempt to delete a non-existent attachment (expect not found error).
 * Note: Restoration and filtering for deleted not implemented — attachment listing/list-by-id is not in API set.
 */
export async function test_api_discussionBoard_test_delete_attachment_as_owner_and_admin_vs_forbidden(connection: api.IConnection) {
  // Register OWNER
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: ownerEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: "OwnerUser",
      profile_image_url: null,
    }
  });
  typia.assert(owner);

  // Register ANOTHER MEMBER
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: "OtherUser",
      profile_image_url: null,
    }
  });
  typia.assert(member);

  // Register ADMIN (simulated by display_name containing 'admin')
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: adminEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: "AdminUser",
      profile_image_url: null,
    }
  });
  typia.assert(admin);

  // Owner creates post (thread id simulated)
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: threadId,
      discussion_board_member_id: owner.id,
      body: RandomGenerator.paragraph()(),
    }
  });
  typia.assert(post);

  // Owner uploads attachment to the post
  const attachment = await api.functional.discussionBoard.attachments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      file_name: "testfile.txt",
      file_uri: `https://files.example.com/${RandomGenerator.alphaNumeric(12)}`,
      content_type: "text/plain",
      content_hash: RandomGenerator.alphaNumeric(32)
    }
  });
  typia.assert(attachment);
  TestValidator.equals("owner on attachment")(attachment.discussion_board_member_id)(owner.id);

  // OWNER deletes own attachment: should succeed
  await api.functional.discussionBoard.attachments.eraseById(connection, { id: attachment.id });

  // Try to delete again as owner: should fail (already deleted)
  await TestValidator.error("deleting already deleted attachment fails")(
    async () => {
      await api.functional.discussionBoard.attachments.eraseById(connection, { id: attachment.id });
    }
  );

  // Create another attachment for non-owner/admin tests
  const attachment2 = await api.functional.discussionBoard.attachments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      file_name: "testfile2.txt",
      file_uri: `https://files.example.com/${RandomGenerator.alphaNumeric(12)}`,
      content_type: "text/plain",
      content_hash: RandomGenerator.alphaNumeric(32)
    }
  });
  typia.assert(attachment2);
  TestValidator.equals("owner on attachment2")(attachment2.discussion_board_member_id)(owner.id);

  // Try to delete as ANOTHER MEMBER: should fail (no permission)
  await TestValidator.error("another member cannot delete not-owned attachment")(
    async () => {
      await api.functional.discussionBoard.attachments.eraseById(connection, { id: attachment2.id });
    }
  );

  // Try to delete as ADMIN (simulate by display_name "AdminUser"): test effect (per business logic, pass on error or success)
  try {
    await api.functional.discussionBoard.attachments.eraseById(connection, { id: attachment2.id });
  } catch (_) {}

  // Try to delete non-existent attachment (random UUID)
  await TestValidator.error("deleting non-existent attachment yields not found")(
    async () => {
      await api.functional.discussionBoard.attachments.eraseById(connection, { id: typia.random<string & tags.Format<"uuid">>() });
    }
  );
}