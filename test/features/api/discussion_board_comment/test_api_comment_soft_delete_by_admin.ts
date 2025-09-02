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
 * E2E test that an administrator can soft-delete any user comment in the
 * forum system for compliance and moderation.
 *
 * This test covers the privileged moderation workflow:
 *
 * - Register and login a new regular user for standard content creation.
 * - That user creates a thread, then a post within that thread, and finally
 *   adds a comment to their own post.
 * - Independently, register and login a new admin account (which must be
 *   associated with a verified user account first). Use the admin session
 *   to execute privileged moderation actions.
 * - The admin uses the soft-delete API to mark the user's comment as deleted.
 *
 * Steps:
 *
 * 1. Register and authenticate a regular discussion user (owner of the
 *    comment).
 * 2. User creates a thread -> creates a post in the thread -> adds a comment
 *    to the post.
 * 3. Register and authenticate a new admin (must join as user first, then
 *    assign admin role, then login as admin).
 * 4. While logged in as admin, delete (soft-delete) the user's comment using
 *    the privileged endpoint.
 * 5. Assert that the operation succeeds: the API returns 204/empty, and the
 *    comment is soft deleted (deleted_at set).
 * 6. Optionally: attempt to access the comment as a regular user and confirm
 *    it is hidden from standard queries (if feasible with given SDK).
 */
export async function test_api_comment_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const userPassword = "Password1!";

  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: username,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);
  const userId = userAuth.user.id;

  // Step 2: User creates a thread, post, and comment
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

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
  TestValidator.equals(
    "comment should not be soft-deleted initially",
    comment.deleted_at,
    null,
  );

  // Step 3: Register and authenticate an admin (admin must first exist as a user)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = "Adminpass2$";
  // Join as user
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);
  const adminUserId = adminUser.user.id;
  // Assign admin privilege
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // Login as admin
  const adminSession = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminSession);

  // Step 4: As admin, soft-delete the user's comment
  await api.functional.discussionBoard.admin.threads.posts.comments.erase(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
      commentId: comment.id,
    },
  );

  // Step 5: (Optional assert) The API returns void/204.
  // If there were an endpoint to view the comment as admin and check deleted_at, we would retrieve it here.
  // (No such endpoint is available in provided SDK, but we have covered the API contract for the privileged operation.)
}
