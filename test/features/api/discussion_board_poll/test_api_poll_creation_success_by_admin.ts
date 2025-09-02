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
import type { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";

/**
 * Test that an administrator can create a poll on a post authored by
 * another user.
 *
 * Steps:
 *
 * 1. Register and login as a standard user.
 * 2. As that user, create a thread.
 * 3. As that user, create a post inside the thread.
 * 4. Register and join an admin account using a new, verified user account (to
 *    ensure admin user exists in discussion_board_users).
 * 5. Log in as admin, switching context to admin.
 * 6. Using the admin account, create a poll on the post (not authored by this
 *    admin user).
 * 7. Validate that the poll creation succeeds and is properly attached.
 *
 * Validation:
 *
 * - API must return HTTP 201 with a poll record in response.
 * - The poll's discussion_board_post_id matches the post created by the user.
 * - Admin is allowed to create the poll (i.e., not limited by non-ownership).
 * - All required poll record fields are present.
 */
export async function test_api_poll_creation_success_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a standard user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = "TestPassword1!";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  // 2. Create a thread as the user
  const threadTitle = RandomGenerator.paragraph({ sentences: 4 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: { title: threadTitle } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  // 3. Create a post in the thread
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
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

  // 4. Register a new verified user to be elevated to admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = "TestAdminPassword1!";
  const adminUserJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUserJoin);
  // 5. Register/join as admin (assign admin to the new user)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserJoin.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // 6. Log in as admin
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 7. As admin, create a poll on the first user's post
  const nowISO = new Date().toISOString();
  const pollTitle = RandomGenerator.paragraph({ sentences: 2 });
  const pollDesc = RandomGenerator.paragraph({ sentences: 5 });
  const pollBody = {
    discussion_board_post_id: post.id,
    title: pollTitle,
    description: pollDesc,
    multi_choice: false,
    opened_at: nowISO,
    closed_at: null,
  } satisfies IDiscussionBoardPoll.ICreate;
  const poll = await api.functional.discussionBoard.admin.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: pollBody,
    },
  );
  typia.assert(poll);
  // Validate success criteria
  TestValidator.equals(
    "poll is attached to correct post",
    poll.discussion_board_post_id,
    post.id,
  );
  TestValidator.equals("poll title correct", poll.title, pollTitle);
  TestValidator.equals("poll description correct", poll.description, pollDesc);
  TestValidator.predicate(
    "poll multi_choice false",
    poll.multi_choice === false,
  );
  TestValidator.equals("poll opened_at correct", poll.opened_at, nowISO);
  TestValidator.equals("poll closed_at is null", poll.closed_at, null);
  typia.assert<string & tags.Format<"uuid">>(poll.id);
  TestValidator.predicate(
    "poll created_at present",
    typeof poll.created_at === "string",
  );
  TestValidator.predicate(
    "poll updated_at present",
    typeof poll.updated_at === "string",
  );
}
