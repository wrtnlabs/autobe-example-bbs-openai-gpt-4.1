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
 * E2E test to ensure moderator comment creation fails with invalid
 * payloads.
 *
 * Verifies required field presence, field length constraints, and parent_id
 * validation.
 *
 * Steps:
 *
 * 1. Register and login as normal user (to create valid thread/post anchors)
 * 2. As user: create a thread, then a post within it (obtain valid IDs)
 * 3. Register and login as moderator (role-under-test authentication)
 * 4. As moderator, attempt invalid comment creations: a) missing body b) empty
 *    body string c) overlength body (>3000 chars) d) invalid parent_id
 *    (random uuid) e) malformed parent_id (if API type system allows)
 *
 * For each invalid case, ensure API rejects creation with
 * validation/business error (TestValidator.error), and that no comment is
 * created in response.
 */
export async function test_api_moderator_comment_creation_invalid_payload(
  connection: api.IConnection,
) {
  // 1. Register & login as standard user (resource setup)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = "A1b2c3d4e5!";
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // 2. Create a thread as user
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post as user in that thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Register and login as moderator (role-under-test authentication)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name();
  const moderatorPassword = "B2c3d4e5f6!";
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 5. Attempt invalid comment creations as moderator
  const threadId = thread.id;
  const postId = post.id;

  // a) Missing body field (empty object)
  await TestValidator.error(
    "Moderator comment create fails with missing body field",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.create(
        connection,
        {
          threadId,
          postId,
          body: {} as any,
        },
      );
    },
  );

  // b) Empty body string
  await TestValidator.error(
    "Moderator comment create fails with empty body string",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.create(
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

  // c) Excessively long body
  await TestValidator.error(
    "Moderator comment create fails with overly long body (>3000 chars)",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.create(
        connection,
        {
          threadId,
          postId,
          body: {
            post_id: postId,
            body: RandomGenerator.paragraph({
              sentences: 3100,
              wordMin: 2,
              wordMax: 4,
            }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // d) Invalid parent_id (random uuid, does not exist)
  await TestValidator.error(
    "Moderator comment create fails with non-existent parent_id",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.create(
        connection,
        {
          threadId,
          postId,
          body: {
            post_id: postId,
            body: RandomGenerator.paragraph({ sentences: 10 }),
            parent_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // e) Malformed parent_id (wrong type, using as any to bypass type)
  await TestValidator.error(
    "Moderator comment create fails with malformed parent_id",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.create(
        connection,
        {
          threadId,
          postId,
          body: {
            post_id: postId,
            body: RandomGenerator.paragraph({ sentences: 5 }),
            parent_id: "not-a-uuid-string" as any,
          } as any,
        },
      );
    },
  );
}
