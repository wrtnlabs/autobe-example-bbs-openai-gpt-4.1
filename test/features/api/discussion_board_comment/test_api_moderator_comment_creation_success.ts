import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test successful creation of a new comment as a moderator under a
 * specified post in a thread.
 *
 * This test verifies the E2E business flow and data validation for
 * discussion board comment creation via moderator role.
 *
 * Steps performed:
 *
 * 1. Register and authenticate a new standard user – creator for thread/post.
 * 2. User creates a new thread (unique, random title).
 * 3. User creates a new post under that thread (unique title/body).
 * 4. Register and authenticate a new moderator (using unique email/username).
 * 5. As moderator, create a root-level comment on the user's post.
 * 6. Assert all associations and role attributions are correct:
 *
 *    - Comment links to right post/thread
 *    - Created_by_id matches moderator user
 *    - Comment body matches input
 *    - Nesting level/parent is correct for root comment
 *    - Soft-delete field is not set (null/missing)
 *    - Moderation status fields are as expected
 *
 * This happy-path scenario covers E2E resource creation, authentication
 * role-context switching, and schema validation. Error/permission/failure
 * cases are NOT included here.
 */
export async function test_api_moderator_comment_creation_success(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(12) + "Aa!1";
  const userJoinResult = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoinResult);
  TestValidator.equals(
    "User join output email matches input",
    userJoinResult.user.email,
    userEmail,
  );
  TestValidator.equals(
    "User join output username matches input",
    userJoinResult.user.username,
    userUsername,
  );

  // Even though join sets context, login ensures explicit session (should pass for already-verified)
  const userLoginResult = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(userLoginResult);
  TestValidator.equals(
    "User login result matches join ID",
    userLoginResult.user.id,
    userJoinResult.user.id,
  );

  // 2. User creates a thread
  const threadTitle = RandomGenerator.paragraph({
    sentences: 4,
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
  TestValidator.equals("Thread title matches input", thread.title, threadTitle);
  TestValidator.predicate("Thread is not locked", !thread.is_locked);
  TestValidator.predicate("Thread is not archived", !thread.is_archived);

  // 3. User creates a post in that thread
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 12,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 14,
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
  TestValidator.equals(
    "Post thread_id matches thread",
    post.thread_id,
    thread.id,
  );
  TestValidator.equals("Post title matches input", post.title, postTitle);
  TestValidator.equals("Post body matches input", post.body, postBody);

  // 4. Moderator registration and authentication
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modUsername = RandomGenerator.name();
  const modPassword = RandomGenerator.alphaNumeric(12) + "Bb@2";
  const modJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      username: modUsername,
      password: modPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(modJoin);
  TestValidator.equals(
    "Moderator join output email matches input (via mod object)",
    modJoin.moderator.is_active,
    true,
  );
  TestValidator.predicate(
    "Moderator join moderator.id is present",
    typeof modJoin.moderator.id === "string" && !!modJoin.moderator.id,
  );

  // 4b. Moderator login (ensures token/session is set and updated)
  const modLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(modLogin);
  TestValidator.equals(
    "Moderator login user_id matches join",
    modLogin.moderator.user_id,
    modJoin.moderator.user_id,
  );
  TestValidator.predicate(
    "Moderator login moderator is_active",
    modLogin.moderator.is_active,
  );

  // 5. As moderator, create a root-level comment on the user's post
  const commentBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 7,
    wordMin: 5,
    wordMax: 14,
  });
  const commentInput: IDiscussionBoardComment.ICreate = {
    post_id: post.id,
    body: commentBody,
    // parent_id omitted for root/top-level comment
  };
  const comment =
    await api.functional.discussionBoard.moderator.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: commentInput,
      },
    );
  typia.assert(comment);
  // 6. Assertions on comment output (schema, association, attribution, content, etc.)
  TestValidator.equals(
    "Comment post_id matches input",
    comment.post_id,
    post.id,
  );
  TestValidator.equals("Comment body matches input", comment.body, commentBody);
  TestValidator.equals(
    "Comment created_by_id is moderator user_id",
    comment.created_by_id,
    modLogin.moderator.user_id,
  );
  TestValidator.equals(
    "Comment is top-level (nesting_level == 0)",
    comment.nesting_level,
    0,
  );
  TestValidator.equals(
    "Comment parent_id is null/undefined (i.e. root)",
    comment.parent_id ?? null,
    null,
  );
  TestValidator.predicate(
    "Comment deleted_at is null/undefined",
    !comment.deleted_at,
  );
}
