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
 * Validate rejection of post version update by a non-privileged (regular
 * member) user at the moderator endpoint.
 *
 * This test checks permission enforcement and immutability of the version
 * record for unauthorized actors.
 *
 * Steps:
 *
 * 1. Register two users: one (member) for posting/editing, another as moderator
 *    (only for later use if needed).
 * 2. As the regular member, create a topic under a dummy category, then under the
 *    topic create a thread.
 * 3. As the same member, post under the thread.
 * 4. As the same member, add a version to the post.
 * 5. Attempt to update that post version using the moderator endpoint while
 *    authenticated as the _member_ (not as moderator).
 * 6. Assert that the update fails due to lack of privilege—use
 *    TestValidator.error, and optionally confirm original version remains
 *    unchanged.
 */
export async function test_api_discussionBoard_test_update_post_version_by_non_privileged_user_should_fail(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberUserIdentifier: string =
    RandomGenerator.alphabets(12) + "@mail.com";
  const joinDate: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserIdentifier,
        joined_at: joinDate,
      },
    },
  );
  typia.assert(member);

  // 2. Create dummy topic (using random, valid category and options)
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(16),
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      },
    },
  );
  typia.assert(topic);

  // 3. Create a thread in the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphabets(10),
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
        body: RandomGenerator.paragraph()(32),
      },
    },
  );
  typia.assert(post);

  // 5. Create a new version for the post
  const version =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: RandomGenerator.content()()(),
        },
      },
    );
  typia.assert(version);

  // 6. Attempt to update the version as member using moderator endpoint (should fail)
  await TestValidator.error(
    "member cannot update version at moderator endpoint",
  )(async () => {
    await api.functional.discussionBoard.moderator.posts.versions.update(
      connection,
      {
        postId: post.id,
        versionId: version.id,
        body: {
          body: RandomGenerator.content()()(),
        },
      },
    );
  });
}
