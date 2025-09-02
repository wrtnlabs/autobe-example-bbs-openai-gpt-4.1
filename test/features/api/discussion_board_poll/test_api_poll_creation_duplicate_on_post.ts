import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";

/**
 * E2E test: Duplicate poll creation on the same post must be forbidden.
 *
 * This test ensures the business rule that only one poll can be attached to
 * a single post.
 *
 * Workflow:
 *
 * 1. Register and authenticate as an ordinary user.
 * 2. Create a new discussion thread.
 * 3. Create a post in that thread.
 * 4. Attach the first poll to the post (should succeed).
 * 5. Attempt to create a second poll on the same post (should fail with
 *    business rule violation).
 *
 * The test passes if the API throws an error on the second poll creation
 * attempt.
 */
export async function test_api_poll_creation_duplicate_on_post(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a discussion board user
  const userRegPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2).replace(/\s+/g, "_"),
    password: "AAaa11!!test", // meets minimum and complexity requirements
    display_name: RandomGenerator.name(1),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const auth: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userRegPayload });
  typia.assert(auth);

  // 2. Create a discussion thread
  const threadCreatePayload = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
  } satisfies IDiscussionBoardThread.ICreate;
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    { body: threadCreatePayload },
  );
  typia.assert(thread);

  // 3. Create a post in the discussion thread
  const postCreatePayload = {
    thread_id: thread.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 6, wordMax: 16 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardPost.ICreate;
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    { threadId: thread.id, body: postCreatePayload },
  );
  typia.assert(post);

  // 4. Attach the first poll to the post
  const now = new Date();
  const pollCreatePayload: IDiscussionBoardPoll.ICreate = {
    discussion_board_post_id: post.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 12,
    }),
    multi_choice: false,
    opened_at: now.toISOString(),
    closed_at: null,
  };
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    { postId: post.id, body: pollCreatePayload },
  );
  typia.assert(poll);

  // 5. Attempt to create a second poll for the same post (should fail with business rule violation)
  const pollDuplicatePayload: IDiscussionBoardPoll.ICreate = {
    discussion_board_post_id: post.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 12,
    }),
    multi_choice: true,
    opened_at: now.toISOString(),
    closed_at: null,
  };
  await TestValidator.error(
    "Cannot create more than one poll per post: API must reject duplicate poll creation",
    async () => {
      await api.functional.discussionBoard.user.posts.polls.create(connection, {
        postId: post.id,
        body: pollDuplicatePayload,
      });
    },
  );
}
