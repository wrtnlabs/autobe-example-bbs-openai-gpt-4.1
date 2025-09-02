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
 * Validate that the admin comment creation API rejects invalid payloads and
 * enforces business constraints.
 *
 * This function tests that:
 *
 * - Comments with an empty 'body' string are rejected.
 * - Nested comments that exceed the maximum allowed nesting level are
 *   rejected.
 *
 * Note: Test cases that require omitting required fields (e.g., "body"
 * property entirely missing) or sending completely empty DTOs are not
 * included. Such invalid payloads cannot be constructed as valid TypeScript
 * per DTO definition and compile-time type safety. Instead, only
 * business-rules and runtime-logic error cases are tested here.
 *
 * Steps:
 *
 * 1. Create a normal user and register/join.
 * 2. Login as user.
 * 3. User creates a thread.
 * 4. User creates a post in the thread.
 * 5. Promote user to admin and login as admin.
 * 6. (Negative case) Attempt to create a comment as admin with an empty string
 *    for 'body' field (should fail).
 * 7. (Nesting constraint) Build a comment chain up to a presumed business
 *    logic maximum (5 levels), then try to exceed nesting limit (should
 *    fail to create comment).
 */
export async function test_api_admin_comment_creation_invalid_payload(
  connection: api.IConnection,
) {
  // 1. User registration/join
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "AdminUser123!";
  const username = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. User login
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 3. User creates a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  const threadId = thread.id;

  // 4. User creates a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        thread_id: threadId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);
  const postId = post.id;

  // 5. Promote user to admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: { user_id: user.user.id } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);

  // 6. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // --- Negative Test Case 1: Attempt to create comment with empty body string ---
  await TestValidator.error(
    "admin comment creation fails with empty body string",
    async () => {
      await api.functional.discussionBoard.admin.threads.posts.comments.create(
        connection,
        {
          threadId,
          postId,
          body: {
            post_id: postId,
            body: "",
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // --- Negative Test Case 2: Exceed nesting level ---
  // Simulate maximum nesting of 5 levels (actual system may differ)
  // 1st: root comment
  const rootComment =
    await api.functional.discussionBoard.admin.threads.posts.comments.create(
      connection,
      {
        threadId,
        postId,
        body: {
          post_id: postId,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(rootComment);
  let parentId = rootComment.id;

  // Next 4: deeper levels (total 5 including root)
  let lastNest = rootComment;
  for (let i = 0; i < 4; ++i) {
    lastNest =
      await api.functional.discussionBoard.admin.threads.posts.comments.create(
        connection,
        {
          threadId,
          postId,
          body: {
            post_id: postId,
            parent_id: parentId,
            body: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(lastNest);
    parentId = lastNest.id;
  }

  // Attempt to exceed maximum nesting
  await TestValidator.error(
    "admin comment creation fails when exceeding nesting limit",
    async () => {
      await api.functional.discussionBoard.admin.threads.posts.comments.create(
        connection,
        {
          threadId,
          postId,
          body: {
            post_id: postId,
            parent_id: parentId,
            body: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
