import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";

/**
 * Validate rejection of post version creation with missing or invalid content.
 *
 * This test covers validation rules for post version creation in the discussion
 * board. It ensures that editing a post (by creating a new version) with
 * missing, empty, or otherwise invalid (malformed) body content is forbidden by
 * the system. Additionally, it confirms that the server returns clear
 * validation errors and does not increment the post version or create an
 * invalid version record.
 *
 * Preparation is required: First, an admin creates a board member. That member
 * then creates a topic, then a thread in that topic, and then a post within the
 * thread. These prerequisite entities are required so that a legitimate post
 * exists for version testing.
 *
 * Steps:
 *
 * 1. Register a new discussion board member via the admin API.
 * 2. Using the registered member, create a topic in the board.
 * 3. Within the topic, create a thread.
 * 4. In the thread, create a post.
 * 5. Attempt to create a new version of the post with a missing (omitted) body
 *    field. Expect a validation error from the backend.
 * 6. Attempt to create a new version of the post with an explicitly empty string
 *    body. Expect a validation error.
 * 7. Attempt to create a new version of the post with body content shorter than
 *    the minimum required length (e.g., 0 or 1 char, if minLength is enforced).
 *    Expect a validation error.
 * 8. Optionally confirm that no new version record has been created by attempting
 *    to fetch post versions or relying on server response.
 */
export async function test_api_discussionBoard_test_create_post_version_with_missing_or_invalid_content_should_fail(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member (admin API)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(16),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Create a topic
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
        description: RandomGenerator.paragraph()(1),
      },
    },
  );
  typia.assert(topic);

  // 3. Create a thread under the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(1),
        },
      },
    );
  typia.assert(thread);

  // 4. Create a post in the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(2),
      },
    },
  );
  typia.assert(post);

  // 5. Attempt to create post version with missing body (should fail at TypeScript level - do not implement)
  // Skipped per implementation feasibility rules.

  // 6. Attempt to create post version with empty string body (should trigger validation error)
  await TestValidator.error("empty body should fail")(() =>
    api.functional.discussionBoard.member.posts.versions.create(connection, {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        body: "",
      },
    }),
  );

  // 7. Attempt to create post version with body that is too short (1 char, if minLength exists; otherwise, just test failure)
  await TestValidator.error("too short body should fail")(() =>
    api.functional.discussionBoard.member.posts.versions.create(connection, {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        body: "a",
      },
    }),
  );
}
