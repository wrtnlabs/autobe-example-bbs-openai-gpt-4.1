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
 * Validate fetching a specific post version by its owner.
 *
 * This test ensures that a discussion board member (the post's owner) can
 * retrieve a particular version (revision) of their post using the version's ID
 * and postId. The version returned must exactly match the content and metadata
 * as created during editing.
 *
 * Test Steps:
 *
 * 1. Create a discussion board member.
 * 2. The member creates a parent topic.
 * 3. The member creates a thread under that topic.
 * 4. The member posts an initial post in the thread.
 * 5. The member edits this post to create one or more versions (revisions).
 * 6. Fetch a specific version by versionId using the API and verify all fields
 *    match the expected version's data.
 */
export async function test_api_discussionBoard_test_fetch_specific_post_version_by_owner(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member (admin endpoint)
  const userIdentifier = RandomGenerator.alphaNumeric(16);
  const memberJoinTime = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: memberJoinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a parent topic (random category for demonstration)
  // The topic requires a valid category and member context; use a random UUID for category.
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(12),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
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
          title: RandomGenerator.paragraph()(1),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 4. Create an initial post in the thread
  const postBodyV1 = RandomGenerator.paragraph()(2);
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: postBodyV1,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Edit (version) the post at least once
  const postBodyV2 = RandomGenerator.paragraph()(3);
  const version =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: postBodyV2,
        } satisfies IDiscussionBoardPostVersion.ICreate,
      },
    );
  typia.assert(version);

  // 6. Fetch the specific post version by versionId (should be the new version)
  const fetchedVersion =
    await api.functional.discussionBoard.member.posts.versions.at(connection, {
      postId: post.id,
      versionId: version.id,
    });
  typia.assert(fetchedVersion);

  // Validate all key fields: id, post ref, editor, version sequence, body, created_at
  TestValidator.equals("version id matches")(fetchedVersion.id)(version.id);
  TestValidator.equals("editor_member_id matches")(
    fetchedVersion.editor_member_id,
  )(version.editor_member_id);
  TestValidator.equals("body matches")(fetchedVersion.body)(postBodyV2);
  TestValidator.equals("post reference matches")(
    fetchedVersion.discussion_board_post_id,
  )(post.id);
  TestValidator.equals("created_at matches")(fetchedVersion.created_at)(
    version.created_at,
  );
  TestValidator.equals("version number matches")(fetchedVersion.version)(
    version.version,
  );
}
