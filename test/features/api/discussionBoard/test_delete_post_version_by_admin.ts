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
 * Test the permanent deletion of a discussion board post version by an
 * administrator.
 *
 * This test simulates the full lifecycle of a post version deletion, ensuring
 * that an admin (with sufficient privilege) can permanently delete a specific
 * version of a post.
 *
 * 1. Register an admin member for authorized deletion operations
 * 2. Create a new discussion topic
 * 3. Create a thread within the topic
 * 4. Create a post within the thread
 * 5. Add a version (edit/snapshot) to the post
 * 6. As admin, delete that version by its versionId
 * 7. As no get/list endpoint for versions is available, conclude the test if
 *    deletion does not throw
 *
 * Note: If/when APIs to get or list post versions exist, extend the test to
 * verify that the deleted version can no longer be retrieved after deletion.
 */
export async function test_api_discussionBoard_test_delete_post_version_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin (enables authorized deletion)
  const adminUserIdentifier = RandomGenerator.alphaNumeric(12);
  const adminJoinDate = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        joined_at: adminJoinDate,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create a new topic (categoryId simulated as UUID)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(16),
        description: RandomGenerator.paragraph()(),
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
          title: RandomGenerator.paragraph()(),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 4. Create a post within the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.content()()(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Add a version (edit/snapshot) to the post
  const version =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: RandomGenerator.content()()(),
        } satisfies IDiscussionBoardPostVersion.ICreate,
      },
    );
  typia.assert(version);

  // 6. Delete the post version as admin
  await api.functional.discussionBoard.admin.posts.versions.erase(connection, {
    postId: post.id,
    versionId: version.id,
  });

  // 7. (No version get/list endpoint: Confirm via absence of errors)
  TestValidator.predicate("Admin successfully deleted the post version")(true);
}
