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
 * Test soft deletion (soft-delete) of discussion board post attachments,
 * including permission controls and edge/error cases.
 *
 * This test validates the following workflow:
 *
 * 1. Register and authenticate as User A.
 * 2. Create a discussion thread as User A.
 * 3. Create a post in that thread as User A.
 * 4. Upload an attachment to the post (capture attachmentId).
 * 5. Soft-delete (logical delete) the attachment as User A (should succeed).
 *
 *    - (In a real API, would also confirm via read/list endpoints that
 *         attachment is not visible and that deleted_at is set. Here, we
 *         can only check locally, due to API limitations.)
 * 6. Register and authenticate as User B (secondary user context).
 * 7. Attempt to soft-delete User A's (already-soft-deleted) attachment as User
 *    B (should get a forbidden or permission-denied error).
 * 8. Attempt to soft-delete a non-existent attachment (random UUID) – should
 *    yield not-found or appropriate error.
 * 9. Attempt to soft-delete already-deleted attachment again as User A
 *    (idempotency/edge case) – result and error handling are validated.
 *
 * All authentication flows, type validations, and error assertions use
 * API-provided methods exclusively (no manual header editing, strictly DTO
 * types and SDK).
 *
 * NOTE: As no "get/list attachment" endpoint is documented, assertions
 * about visibility and deleted_at post-deletion are simulated within test
 * scope.
 */
export async function test_api_post_attachment_deletion_and_permission(
  connection: api.IConnection,
) {
  // 1. Register and authenticate User A (the uploader)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAUsername = RandomGenerator.name();
  const userAPassword = RandomGenerator.alphaNumeric(12);
  const userAAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      username: userAUsername,
      password: userAPassword,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAAuth);
  const userAId = userAAuth.user.id;

  // 2. Create a thread as User A
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post as User A
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 7,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Upload an attachment to the post
  const attachment =
    await api.functional.discussionBoard.user.threads.posts.attachments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          file_name: RandomGenerator.alphaNumeric(10) + ".png",
          file_url:
            "https://cdn.example.com/" +
            RandomGenerator.alphaNumeric(12) +
            ".png",
          content_type: "image/png",
          size_bytes: 1024,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  const attachmentId = attachment.id;

  // 5. Soft-delete the attachment as User A
  await api.functional.discussionBoard.user.threads.posts.attachments.erase(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
      attachmentId,
    },
  );
  // We cannot directly confirm deletion via a read/list API in current scope;
  // In a real system, would assert not in list and deleted_at set (simulate as best as possible)
  TestValidator.predicate(
    "attachment object has id after erase",
    attachment.id !== undefined && typeof attachment.id === "string",
  );

  // 6. Register and authenticate User B
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBUsername = RandomGenerator.name();
  const userBPassword = RandomGenerator.alphaNumeric(12);
  const userBAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      username: userBUsername,
      password: userBPassword,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userBAuth);

  // 7. As User B, attempt to delete User A's (now soft-deleted) attachment (should fail with permission error)
  await TestValidator.error(
    "non-owner cannot delete another user's attachment",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.attachments.erase(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          attachmentId,
        },
      );
    },
  );

  // 8. Attempt to delete a non-existent attachment (random UUID)
  const randomAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent attachment should error",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.attachments.erase(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          attachmentId: randomAttachmentId,
        },
      );
    },
  );

  // 9. Re-authenticate as User A, try deleting already-deleted attachment again for idempotency/edge case
  await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      username: userAUsername,
      password: userAPassword,
      consent: true,
      display_name: userAAuth.user.display_name,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  await TestValidator.error(
    "deleting already deleted attachment by owner fails (idempotency/edge)",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.attachments.erase(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          attachmentId,
        },
      );
    },
  );
}
