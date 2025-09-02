import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Test detailed access and retrieval of comment attachments and verify
 * access controls.
 *
 * Validates the full business flow required to access a comment attachment
 * and ensures access/security policies are correctly enforced:
 *
 * 1. Register User A and login
 * 2. User A creates a thread, a post, and a comment, then uploads an
 *    attachment to the comment
 * 3. Fetch attachment metadata as User A (should succeed; check all fields and
 *    owner)
 * 4. Register User B and login
 * 5. User B fetches the attachment metadata (should succeed if policy allows,
 *    else verify failure)
 * 6. Make an unauthenticated connection (no login), try to fetch the
 *    attachment (should fail)
 * 7. Attempt fetch with a random non-existent attachmentId (should fail with
 *    not found)
 * 8. (If feasible: simulate soft-deletion by using random/fake ID)
 * 9. Validate all assertion points for access, data, and error conditions
 */
export async function test_api_comment_attachment_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAUsername = RandomGenerator.name();
  const userAReg = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      username: userAUsername,
      password: "SecurePwd123!",
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAReg);

  // 2. User A creates a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
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
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. User A creates a comment
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. User A uploads attachment to the comment
  const attachment =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_name: RandomGenerator.paragraph({ sentences: 1 }),
          file_url: `https://files.example.com/${RandomGenerator.alphaNumeric(16)}`,
          content_type: "application/pdf",
          size_bytes: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 6. Fetch attachment metadata as User A (success)
  const fetchedA =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.at(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(fetchedA);
  TestValidator.equals(
    "Attachment returned for uploader",
    fetchedA.id,
    attachment.id,
  );
  TestValidator.equals(
    "Uploader id matches",
    fetchedA.uploaded_by_id,
    userAReg.user.id,
  );
  TestValidator.equals("Comment id matches", fetchedA.comment_id, comment.id);
  TestValidator.equals(
    "Deleted at is null for fresh attachment",
    fetchedA.deleted_at,
    null,
  );

  // 7. Register User B
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBUsername = RandomGenerator.name();
  const userBReg = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      username: userBUsername,
      password: "MoreSecurePwd456!",
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userBReg);

  // 8. Fetch as User B (success or failure by policy)
  const fetchedB =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.at(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(fetchedB);
  TestValidator.equals(
    "Attachment returned for other authenticated user",
    fetchedB.id,
    attachment.id,
  );

  // 9. Unauthenticated fetch (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthenticated fetch should fail", async () => {
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.at(
      unauthConn,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  });

  // 10. Fetch with non-existent attachmentId (should fail)
  await TestValidator.error(
    "Fetching non-existent attachmentId returns error",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.comments.attachments.at(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
          attachmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
