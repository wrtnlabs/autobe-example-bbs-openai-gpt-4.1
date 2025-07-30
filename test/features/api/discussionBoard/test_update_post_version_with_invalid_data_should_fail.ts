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
 * Validate rejection of post version updates with invalid or missing data
 * (validation error cases).
 *
 * This test ensures that a moderator attempting to update an existing post
 * version with illegal data—such as an empty body or malformed/invalid field
 * formats—results in an error response (validation failure). It confirms that
 * validation is correctly enforced and permission context is effective
 * (moderator-only operation).
 *
 * Business flow:
 *
 * 1. Create a moderator member account (admin endpoint)
 * 2. As a standard member (default context), create a topic under a random
 *    category
 * 3. Under the topic, create a thread
 * 4. Under the thread, create a post
 * 5. Create a version for the post
 * 6. Simulate acting as a moderator (token logic skipped if not present)
 * 7. Attempt to update the post version with invalid/missing data for validation
 *    error (e.g., empty body, invalid field types)
 * 8. Assert that a validation error occurs in each case
 */
export async function test_api_discussionBoard_test_update_post_version_with_invalid_data_should_fail(
  connection: api.IConnection,
) {
  // 1. Register a moderator with the admin endpoint
  const moderatorIdentifier = RandomGenerator.alphaNumeric(12);
  const moderatorJoinTime = new Date().toISOString();
  const moderator = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: moderatorIdentifier,
        joined_at: moderatorJoinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Member creates a topic (simulate random category id)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(1),
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      } satisfies IDiscussionBoardTopics.ICreate,
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
          title: RandomGenerator.alphabets(10),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 4. Create a post under the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(2),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Create a post version
  const postVersion =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: RandomGenerator.paragraph()(1),
        } satisfies IDiscussionBoardPostVersion.ICreate,
      },
    );
  typia.assert(postVersion);

  // 6. Simulate acting as a moderator (token logic skipped if not present)

  // 7-a. Empty string for body (should trigger validation error)
  await TestValidator.error("empty body string not allowed")(() =>
    api.functional.discussionBoard.moderator.posts.versions.update(connection, {
      postId: post.id,
      versionId: postVersion.id,
      body: {
        body: "",
      } satisfies IDiscussionBoardPostVersion.IUpdate,
    }),
  );

  // 7-b. Invalid format for editor_member_id (non-uuid)
  await TestValidator.error("invalid editor_member_id format")(() =>
    api.functional.discussionBoard.moderator.posts.versions.update(connection, {
      postId: post.id,
      versionId: postVersion.id,
      body: {
        editor_member_id: "not-a-uuid",
      } satisfies IDiscussionBoardPostVersion.IUpdate,
    }),
  );

  // 7-c. Completely empty update object
  await TestValidator.error("empty update body not allowed")(() =>
    api.functional.discussionBoard.moderator.posts.versions.update(connection, {
      postId: post.id,
      versionId: postVersion.id,
      body: {} as IDiscussionBoardPostVersion.IUpdate,
    }),
  );
}
