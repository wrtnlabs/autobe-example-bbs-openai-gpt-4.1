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
 * Validates successful update of a discussion board comment by an admin
 * user.
 *
 * This test covers the following workflow:
 *
 * 1. Register and login both a user and admin, with cross-role context
 *    switching
 * 2. As user, create a new discussion thread
 * 3. As user, create a post in the thread
 * 4. As admin, create a top-level comment under the post
 * 5. As admin, update the comment's body
 * 6. Assert updated comment has expected modified content and a newer
 *    updated_at timestamp, while all other fields stay consistent
 *
 * Business rules enforced:
 *
 * - Admin-only permissions for comment update endpoint
 * - Only comment "body" can be changed by update; other fields (id,
 *   created_at) must be invariant
 * - Authentication tokens and session switching are respected at each step
 * - The update is reflected in the returned comment entity (body/updated_at)
 * - The comment's previous body and updated body differ, confirming business
 *   logic
 */
export async function test_api_admin_comment_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register and login as a standard user
  const userReg = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "UserPassword123!",
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userReg);
  const user = userReg.user;
  const userEmail = user.email;
  const userPassword = "UserPassword123!";

  // Step 2: Register and login as an admin-linked user
  const adminReg = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "AdminPassword123!",
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminReg);
  const adminUser = adminReg.user;
  const adminEmail = adminUser.email;
  const adminPassword = "AdminPassword123!";

  // Assign admin rights by registering the admin user as platform admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUser.id } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // Admin login (ensure proper admin authentication for /admin endpoints)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // Switch context to user for thread and post creation
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Step 3: User creates a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // Step 4: User creates a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 4,
          sentenceMax: 8,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Switch context to admin for comment creation and update
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Step 5: Admin creates a top-level comment under the post
  const commentCreate =
    await api.functional.discussionBoard.admin.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentCreate);

  // Save old values for assertion
  const prevBody = commentCreate.body;
  const prevUpdated = commentCreate.updated_at;
  const commentId = commentCreate.id;

  // Step 6: Admin updates the comment body
  const updatedBody = RandomGenerator.paragraph({ sentences: 5 });
  const updatedComment =
    await api.functional.discussionBoard.admin.threads.posts.comments.update(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: commentId,
        body: { body: updatedBody } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Assertion: Only body and updated_at are changed, id and other fields same
  TestValidator.notEquals(
    "Comment body should be updated",
    updatedComment.body,
    prevBody,
  );
  TestValidator.notEquals(
    "Comment updated_at should be updated",
    updatedComment.updated_at,
    prevUpdated,
  );
  TestValidator.equals(
    "Comment id remains invariant",
    updatedComment.id,
    commentId,
  );
  TestValidator.equals(
    "Comment post_id remains invariant",
    updatedComment.post_id,
    post.id,
  );
  TestValidator.equals(
    "Comment created_by_id remains invariant",
    updatedComment.created_by_id,
    commentCreate.created_by_id,
  );
  TestValidator.equals(
    "Comment created_at remains invariant",
    updatedComment.created_at,
    commentCreate.created_at,
  );
  TestValidator.equals(
    "Nesting level remains",
    updatedComment.nesting_level,
    commentCreate.nesting_level,
  );
  if (
    typeof commentCreate.parent_id !== "undefined" ||
    typeof updatedComment.parent_id !== "undefined"
  ) {
    TestValidator.equals(
      "Parent id remains invariant",
      updatedComment.parent_id,
      commentCreate.parent_id,
    );
  }
}
