import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Tests updating attachment metadata for a post by the rightful owner (User
 * A) and verifies that ownership and allowed field update rules are
 * enforced.
 *
 * Business context: Only allowed metadata fields (file_name, content_type)
 * can be updated. API and TypeScript contract forbid updating file_url,
 * post_id, comment_id, or size_bytes. Only the uploader may update
 * metadata; unauthorized users must receive errors. Test covers successful
 * allowed update and forbidden owner scenario (but cannot test
 * schema-forbidden operations).
 */
export async function test_api_post_attachment_update_metadata_by_owner(
  connection: api.IConnection,
) {
  // 1. Register User A
  const emailA = typia.random<string & tags.Format<"email">>();
  const usernameA = RandomGenerator.name();
  const registerA = await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      username: usernameA,
      password: "Password!2345",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(registerA);

  // 2. User A creates a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. User A creates a post
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. User A uploads an attachment to the post
  const attachment =
    await api.functional.discussionBoard.user.threads.posts.attachments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          file_name: "test_original.txt",
          file_url: "https://storage.server/test_original.txt",
          content_type: "text/plain",
          size_bytes: 11,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 5. Update attachment metadata (file_name + content_type)
  const updatedFileName = "renamed_final.pdf";
  const updatedContentType = "application/pdf";
  const updated =
    await api.functional.discussionBoard.user.threads.posts.attachments.update(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        attachmentId: attachment.id,
        body: {
          file_name: updatedFileName,
          content_type: updatedContentType,
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("file_name updated", updated.file_name, updatedFileName);
  TestValidator.equals(
    "content_type updated",
    updated.content_type,
    updatedContentType,
  );
  // non-metadata fields remain unchanged
  TestValidator.equals(
    "file_url unchanged",
    updated.file_url,
    attachment.file_url,
  );
  TestValidator.equals(
    "size_bytes unchanged",
    updated.size_bytes,
    attachment.size_bytes,
  );
  TestValidator.equals(
    "uploader unchanged",
    updated.uploaded_by_id,
    attachment.uploaded_by_id,
  );

  // Cannot test forbidden fields: schema does not allow sending forbidden props

  // 6. Register User B and login as User B
  const emailB = typia.random<string & tags.Format<"email">>();
  const usernameB = RandomGenerator.name();
  await api.functional.auth.user.join(connection, {
    body: {
      email: emailB,
      username: usernameB,
      password: "UserBpass!1234",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // 7. As User B, attempt to update User A's attachment (should fail)
  await TestValidator.error("non-owner cannot update attachment", async () => {
    await api.functional.discussionBoard.user.threads.posts.attachments.update(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        attachmentId: attachment.id,
        body: {
          file_name: "illegal_edit_by_b.pdf",
        },
      },
    );
  });
}
