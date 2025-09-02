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
 * Validate that an admin is able to create a comment under a user-created
 * post within a discussion thread.
 *
 * This test covers the following business workflow:
 *
 * 1. Register a standard user and authenticate.
 * 2. As user, create a thread (topic).
 * 3. As user, create a post under that thread.
 * 4. Register an admin account and authenticate as admin (by elevating the
 *    user).
 * 5. As admin, create a comment for the user's post in the thread.
 * 6. Validate that the comment is returned with correct attribution, all
 *    fields are present according to the schema, and business relations
 *    (post, parent, admin as creator) are consistent.
 */
export async function test_api_admin_comment_creation_success(
  connection: api.IConnection,
) {
  // 1. Register standard user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12) + "Aa!1";
  const username = RandomGenerator.name();
  const displayName = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: username,
      password: userPassword,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Authenticate as user (ensure valid login/session for creation)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 3. Create thread as user
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.predicate(
    "thread was created with the correct creator",
    thread.created_by_id === user.user.id,
  );
  TestValidator.equals("thread title matches input", thread.title, threadTitle);

  // 4. Create post under the thread as user
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 10,
  });
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: postTitle,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.predicate(
    "post is associated with correct thread",
    post.thread_id === thread.id,
  );
  TestValidator.predicate(
    "post was created by user",
    post.created_by_id === user.user.id,
  );
  TestValidator.equals("post title matches input", post.title, postTitle);
  TestValidator.equals("post body matches input", post.body, postBody);

  // 5. Register admin (based on user context, promoting the current user)
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: user.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);

  // 6. Authenticate as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 7. Create comment as admin under the post
  const commentBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 8,
    wordMin: 5,
    wordMax: 15,
  });
  const comment =
    await api.functional.discussionBoard.admin.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: commentBody,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 8. Assert created comment fields and business links
  TestValidator.equals(
    "comment is attached to correct post",
    comment.post_id,
    post.id,
  );
  TestValidator.equals(
    "comment was created by admin user",
    comment.created_by_id,
    user.user.id,
  );
  TestValidator.equals("comment text matches input", comment.body, commentBody);
  TestValidator.predicate(
    "comment nesting is top-level (0)",
    comment.nesting_level === 0,
  );
  TestValidator.predicate(
    "comment returns valid id (uuid)",
    typeof comment.id === "string" && /^[0-9a-fA-F-]{36}$/.test(comment.id),
  );
  TestValidator.predicate(
    "comment timestamps present",
    !!comment.created_at && !!comment.updated_at,
  );
  TestValidator.equals("comment is not soft-deleted", comment.deleted_at, null);
}
