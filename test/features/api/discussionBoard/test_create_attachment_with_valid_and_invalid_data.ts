import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Validate uploading attachments for posts in the discussion board system.
 *
 * Business context: Attachments can only be uploaded by authenticated members,
 * and must be associated with either a valid post or comment. This test ensures
 * correct enforcement of authentication, data integrity (unique content hash),
 * and foreign key logic for attachments.
 *
 * Steps:
 * 1. Register a new member (via /discussionBoard/members)
 * 2. Create a post (via /discussionBoard/posts), using the member's id and a
 *    generated thread id
 * 3. Upload a valid attachment linked to the post as the authenticated member;
 *    verify return matches input and contains correct metadata
 * 4. Attempt to upload same attachment as unauthenticated user (should fail)
 * 5. Attempt to upload duplicate content_hash (should fail, deduplication enforced)
 * 6. Attempt to upload referencing invalid post id (should fail with foreign key error)
 */
export async function test_api_discussionBoard_test_create_attachment_with_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // Step 1: Register member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphabets(20),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, { body: memberInput });
  typia.assert(member);

  // Step 2: Create a post for this member
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const postInput: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: threadId,
    discussion_board_member_id: member.id,
    body: RandomGenerator.paragraph()(),
  };
  const post = await api.functional.discussionBoard.posts.post(connection, { body: postInput });
  typia.assert(post);

  // Step 3: Upload valid attachment
  const validAttachmentInput: IDiscussionBoardAttachment.ICreate = {
    discussion_board_post_id: post.id,
    file_name: "MyDoc.pdf",
    file_uri: "https://files.example.com/mydoc.pdf",
    content_type: "application/pdf",
    content_hash: RandomGenerator.alphabets(64),
  };
  const attachment = await api.functional.discussionBoard.attachments.post(connection, { body: validAttachmentInput });
  typia.assert(attachment);
  TestValidator.equals("attached to correct post")(attachment.discussion_board_post_id)(post.id);
  TestValidator.equals("file name matches")(attachment.file_name)(validAttachmentInput.file_name);
  TestValidator.equals("content hash matches")(attachment.content_hash)(validAttachmentInput.content_hash);

  // Step 4: Attempt upload as unauthenticated user (simulate by clearing headers)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated upload fails")(async () => {
    await api.functional.discussionBoard.attachments.post(unauthConn, { body: validAttachmentInput });
  });

  // Step 5: Duplicate content_hash (should fail)
  await TestValidator.error("duplicate content_hash fails")(async () => {
    await api.functional.discussionBoard.attachments.post(connection, { body: validAttachmentInput });
  });

  // Step 6: Invalid parent post id (should fail with foreign key error)
  const invalidParent = { ...validAttachmentInput, discussion_board_post_id: typia.random<string & tags.Format<"uuid">>() };
  await TestValidator.error("invalid parent id fails")(async () => {
    await api.functional.discussionBoard.attachments.post(connection, { body: invalidParent });
  });
}