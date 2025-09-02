import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate retrieval of reply detail by author in a discussion board
 * scenario.
 *
 * This test covers the full flow:
 *
 * 1. Register a new user (to get authentication and author context)
 * 2. Create a new thread
 * 3. Create a new post in the thread
 * 4. Create a new comment on the post (parent comment)
 * 5. Create a new reply to the parent comment
 * 6. Retrieve the reply detail via GET endpoint
 * 7. Assert all fields are present and match what was created
 * 8. Assert deleted_at is null, post_id is correct, parent_id is correct,
 *    created_by_id matches, and content matches
 *
 * Also validates timestamps for correct format, and that the reply's
 * parent_id is non-null (should be set for replies).
 */
export async function test_api_get_comment_reply_detail_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register new user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "Password123!";
  const display_name = RandomGenerator.name(1);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);
  // Step 2: Create a discussion thread
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: { title: threadTitle } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  // Step 3: Create a post in the thread
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
  // Step 4: Add a parent comment
  const parentCommentBody = RandomGenerator.paragraph({ sentences: 4 });
  const parent =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: parentCommentBody,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parent);
  // Step 5: Add a reply (nested comment)
  const replyBody = RandomGenerator.paragraph({ sentences: 2 });
  const reply =
    await api.functional.discussionBoard.user.threads.posts.comments.replies.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: parent.id,
        body: {
          post_id: post.id,
          parent_id: parent.id,
          body: replyBody,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(reply);
  // Step 6: Retrieve reply by ID
  const read =
    await api.functional.discussionBoard.user.threads.posts.comments.replies.at(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: parent.id,
        replyId: reply.id,
      },
    );
  typia.assert(read);
  // Step 7: Assertions
  TestValidator.equals("reply id matches", read.id, reply.id);
  TestValidator.equals("reply post_id matches", read.post_id, post.id);
  TestValidator.equals("reply parent_id matches", read.parent_id, parent.id);
  TestValidator.equals(
    "reply author (created_by_id) matches user.id",
    read.created_by_id,
    user.user.id,
  );
  TestValidator.equals("reply body matches", read.body, replyBody);
  TestValidator.equals(
    "reply nesting_level matches",
    read.nesting_level,
    reply.nesting_level,
  );
  TestValidator.equals(
    "reply is not deleted (deleted_at is null)",
    read.deleted_at,
    null,
  );
  // Timestamp validity checks
  TestValidator.predicate(
    "reply created_at is a date-time string",
    typeof read.created_at === "string" && !isNaN(Date.parse(read.created_at)),
  );
  TestValidator.predicate(
    "reply updated_at is a date-time string",
    typeof read.updated_at === "string" && !isNaN(Date.parse(read.updated_at)),
  );
  TestValidator.predicate(
    "reply parent_id is not null/undefined (must be reply, not top-level comment)",
    read.parent_id !== null && read.parent_id !== undefined,
  );
}
