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
 * Test that creating a post version by a non-owner is forbidden.
 *
 * This test enforces that only the owner of a discussion board post is
 * permitted to create a new version (edit). It validates that an unauthorized
 * member (not the post creator) receives an authorization error when attempting
 * to create a version for another user's post.
 *
 * Steps:
 *
 * 1. Create Member A and Member B (distinct users) via admin API.
 * 2. As Member A, create a discussion topic (with random parameters).
 * 3. As Member A, create a thread under the topic.
 * 4. As Member A, create a post in the thread.
 * 5. As Member B, attempt to create a new version for the post created by A.
 * 6. Assert that the system rejects the unauthorized attempt with an error.
 *
 * (Note: This test assumes that authentication context switching between
 * members is managed by the test harness/framework. Calls are sequenced
 * accordingly; if explicit login APIs are required, insert them at step
 * changes.)
 */
export async function test_api_discussionBoard_test_create_post_version_by_non_owner_should_fail(
  connection: api.IConnection,
) {
  // 1. Create Member A
  const memberA_identifier: string = RandomGenerator.alphaNumeric(12);
  const memberA = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberA_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberA);

  // 1. Create Member B
  const memberB_identifier: string = RandomGenerator.alphaNumeric(12);
  const memberB = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberB_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberB);

  // [Assumption] Switch authentication context to Member A if required by test harness

  // 2. As Member A, create a topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 3. As Member A, create a thread under the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(1),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 4. As Member A, create a post in the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: "This is a post body owned by Member A.",
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // [Assumption] Switch authentication context to Member B if required by test harness

  // 5 & 6. As Member B, attempt to create a version for A's post
  await TestValidator.error(
    "Non-owner cannot create a post version for someone else's post.",
  )(async () => {
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: "Member B attempting unauthorized post version edit.",
        } satisfies IDiscussionBoardPostVersion.ICreate,
      },
    );
  });
}
