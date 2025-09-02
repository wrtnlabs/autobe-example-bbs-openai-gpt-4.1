import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test that updating a comment as admin after it has been soft deleted is
 * forbidden.
 *
 * This test verifies the business rule that once a comment has been soft
 * deleted, it cannot be updated—even by an administrator. It validates
 * proper enforcement of comment immutability post-deletion and that an
 * error is thrown by the API if an update is attempted on such a comment.
 *
 * Workflow:
 *
 * 1. Register and authenticate as a standard user (foundation for admin
 *    promotion)
 * 2. Create a discussion thread as the user
 * 3. Create a post within the thread as the user
 * 4. Elevate that user to admin via admin registration (and re-authenticate as
 *    admin)
 * 5. As the admin, create a comment on the post
 * 6. Soft delete this comment as admin (sets deleted_at)
 * 7. Attempt to update the deleted comment as admin, expecting an error
 */
export async function test_api_admin_comment_update_forbidden_on_deleted_comment(
  connection: api.IConnection,
) {
  // 1. Register a standard user (to serve as thread/post creator and admin)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12) + "A1$"; // strong password: at least 1 uppercase, digit, and special char
  const userUsername = RandomGenerator.name();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. Authenticate as user (explicit, ensuring user session is correct)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 3. Create a new discussion thread as this user
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 4. In the thread, create a new post as user
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

  // 5. Elevate this user to admin (since only existing users can become admin)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: userAuth.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 6. Re-authenticate as admin using the user's credentials (admin session)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 7. As admin, create a comment on the created post
  const comment =
    await api.functional.discussionBoard.admin.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 7,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 8. Soft delete this comment as admin
  await api.functional.discussionBoard.admin.threads.posts.comments.erase(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
      commentId: comment.id,
    },
  );

  // 9. Attempt to update the now-deleted comment (must throw error)
  await TestValidator.error(
    "forbid update on soft-deleted comment as admin",
    async () => {
      await api.functional.discussionBoard.admin.threads.posts.comments.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
          body: {
            body: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 10,
            }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
