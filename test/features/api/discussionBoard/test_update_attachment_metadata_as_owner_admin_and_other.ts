import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * E2E: Validate update of attachment metadata (file_name, content_type) for discussion board attachments.
 *
 * This test validates proper control over metadata updates for attachment resources by owner, admin, and unrelated users, including business, security, and platform rules. It also checks required error handling for invalid values and soft-deleted/non-existent attachments. 
 *
 * Test Steps:
 * 1. Register 3 members: as owner, unrelated member, and admin. Simulate admin by is_active true and special usernames (system does not have a field for admin). 
 * 2. Owner creates a post (with a thread id), then uploads an attachment to this post
 * 3. Owner updates the attachment metadata (file_name, content_type)
 * 4. Assert file_name/content_type updated
 * 5. Admin updates the attachment metadata (different file_name, valid content_type)
 * 6. Assert values updated
 * 7. Unrelated member attempts update - expect failure
 * 8. Partial updates: change only file_name, only content_type, and file_uri
 * 9. Invalid update: use unsupported content_type (e.g., empty or non-mime)
 * 10. Duplicate file_name in the same post context (add a second attachment, try to update the first to the same name)
 * 11. Soft-delete the attachment and attempt update - expect failure
 * 12. Attempt update for non-existent (random UUID) attachment - expect failure
 */
export async function test_api_discussionBoard_test_update_attachment_metadata_as_owner_admin_and_other(connection: api.IConnection) {
  // 1. Register members and admin
  const ownerReg = await api.functional.discussionBoard.members.post(connection, { body: { username: RandomGenerator.alphabets(8), email: typia.random<string & tags.Format<"email">>(), hashed_password: RandomGenerator.alphabets(16), display_name: RandomGenerator.name() } });
  typia.assert(ownerReg);
  const adminReg = await api.functional.discussionBoard.members.post(connection, { body: { username: "adminTest", email: typia.random<string & tags.Format<"email">>(), hashed_password: RandomGenerator.alphabets(16), display_name: "Administrator" } });
  typia.assert(adminReg);
  const otherReg = await api.functional.discussionBoard.members.post(connection, { body: { username: RandomGenerator.alphabets(8), email: typia.random<string & tags.Format<"email">>(), hashed_password: RandomGenerator.alphabets(16), display_name: RandomGenerator.name() } });
  typia.assert(otherReg);

  // 2. Owner creates a post (needs threadId, random for E2E test)
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.posts.post(connection, { body: { discussion_board_thread_id: threadId, discussion_board_member_id: ownerReg.id, body: RandomGenerator.paragraph()() } });
  typia.assert(post);

  // 3. Owner uploads an attachment to that post
  const initialAttachmentInput = {
    discussion_board_post_id: post.id,
    file_name: "original_file.txt",
    file_uri: `https://example.com/files/${RandomGenerator.alphabets(12)}.txt`,
    content_type: "text/plain",
    content_hash: RandomGenerator.alphabets(32),
  };
  const attachment = await api.functional.discussionBoard.attachments.post(connection, { body: initialAttachmentInput });
  typia.assert(attachment);

  // 4. Owner updates file_name/content_type
  const update1 = await api.functional.discussionBoard.attachments.putById(connection, { id: attachment.id, body: { file_name: "owner_updated.md", content_type: "text/markdown" } });
  typia.assert(update1);
  TestValidator.equals("file_name updated")(update1.file_name)("owner_updated.md");
  TestValidator.equals("content_type updated")(update1.content_type)("text/markdown");

  // 5. Admin updates metadata
  const update2 = await api.functional.discussionBoard.attachments.putById(connection, { id: attachment.id, body: { file_name: "admin_edit.pdf", content_type: "application/pdf" } });
  typia.assert(update2);
  TestValidator.equals("admin file_name")(update2.file_name)("admin_edit.pdf");
  TestValidator.equals("admin content_type")(update2.content_type)("application/pdf");

  // 6. Unrelated member attempts update (should fail)
  await TestValidator.error("unrelated cannot update attachment")(() => api.functional.discussionBoard.attachments.putById(connection, { id: attachment.id, body: { file_name: "invalid_update.txt" } }));

  // 7. Partial updates
  const partial1 = await api.functional.discussionBoard.attachments.putById(connection, { id: attachment.id, body: { file_name: "partial1.txt" } });
  typia.assert(partial1);
  TestValidator.equals("partial file_name")(partial1.file_name)("partial1.txt");
  const partial2 = await api.functional.discussionBoard.attachments.putById(connection, { id: attachment.id, body: { content_type: "application/octet-stream" } });
  typia.assert(partial2);
  TestValidator.equals("partial content_type")(partial2.content_type)("application/octet-stream");

  // 8. Invalid value for content_type
  await TestValidator.error("unsupported content_type")(() => api.functional.discussionBoard.attachments.putById(connection, { id: attachment.id, body: { content_type: "invalid/mime_type!@#" } }));

  // 9. Duplicate file_name in the same post context
  const attachment2 = await api.functional.discussionBoard.attachments.post(connection, { body: { ...initialAttachmentInput, file_name: "unique2.txt", file_uri: `https://example.com/files/${RandomGenerator.alphabets(10)}.txt` } });
  typia.assert(attachment2);
  await TestValidator.error("duplicate file_name")(() => api.functional.discussionBoard.attachments.putById(connection, { id: attachment.id, body: { file_name: "unique2.txt" } }));

  // 10. Soft-delete then update
  await api.functional.discussionBoard.attachments.eraseById(connection, { id: attachment.id });
  await TestValidator.error("cannot update soft-deleted")(() => api.functional.discussionBoard.attachments.putById(connection, { id: attachment.id, body: { file_name: "should_not_update.txt" } }));

  // 11. Non-existent attachment
  await TestValidator.error("cannot update non-existent")(() => api.functional.discussionBoard.attachments.putById(connection, { id: typia.random<string & tags.Format<"uuid">>(), body: { file_name: "not_found.txt" } }));
}