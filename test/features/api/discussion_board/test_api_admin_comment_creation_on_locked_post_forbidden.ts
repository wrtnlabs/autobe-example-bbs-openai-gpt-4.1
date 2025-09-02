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
 * Test that admin cannot create a comment on a locked post.
 *
 * Business rule: once a post is locked, further comments are forbidden,
 * even for admin. This protects post integrity and ensures moderation
 * policies are respected.
 *
 * Steps:
 *
 * 1. Register and authenticate a standard user (used for thread/post creation
 *    and post locking)
 * 2. Register and authenticate admin (using a verified user_id)
 * 3. As user, create a thread
 * 4. As user, create a post in the thread
 * 5. As user, lock the post (using update to set is_locked = true)
 * 6. Switch context to admin (login as admin)
 * 7. Attempt to create a comment as admin on the locked post (expect forbidden
 *    error — access denied)
 * 8. Assert that the comment is not created and the error matches expected
 *    logical validation
 */
export async function test_api_admin_comment_creation_on_locked_post_forbidden(
  connection: api.IConnection,
) {
  // 1. Register & login as user
  const user_email = typia.random<string & tags.Format<"email">>();
  const user_password = "UserP@ssword1234";
  const user_username = RandomGenerator.name();
  // Consent is required for registration
  const user_join = await api.functional.auth.user.join(connection, {
    body: {
      email: user_email,
      username: user_username,
      password: user_password,
      consent: true,
      // display_name optional
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user_join);

  // 2. Register & login as admin (requires a verified user_id)
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = "AdminP@ssword5678";
  const admin_username = RandomGenerator.name();
  const admin_join_user = await api.functional.auth.user.join(connection, {
    body: {
      email: admin_email,
      username: admin_username,
      password: admin_password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(admin_join_user);

  const admin_join = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: admin_join_user.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin_join);

  // 3. As user, login for thread/post creation
  await api.functional.auth.user.login(connection, {
    body: {
      email: user_email,
      password: user_password,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 4. User creates a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 5. User creates a post in the thread
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

  // 6. User locks the post (update is_locked:true)
  const locked_post =
    await api.functional.discussionBoard.user.threads.posts.update(connection, {
      threadId: thread.id,
      postId: post.id,
      body: {
        is_locked: true,
      } satisfies IDiscussionBoardPost.IUpdate,
    });
  typia.assert(locked_post);
  TestValidator.equals("post is now locked", locked_post.is_locked, true);

  // 7. Switch context to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin_email,
      password: admin_password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 8. Attempt to create a comment as admin (should fail: forbidden)
  await TestValidator.error(
    "admin cannot comment on a locked post",
    async () => {
      await api.functional.discussionBoard.admin.threads.posts.comments.create(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            post_id: post.id,
            body: RandomGenerator.paragraph({ sentences: 3 }),
            // top-level comment: parent_id omitted
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
