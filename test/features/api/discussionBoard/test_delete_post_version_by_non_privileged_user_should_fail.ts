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
 * Test: Regular member cannot delete a post version via the moderator endpoint.
 *
 * This test ensures proper enforcement of role-based permissions in the
 * discussion board:
 *
 * - Only users with privileged roles (moderator/admin) may delete versions of
 *   posts through the moderator endpoint.
 * - A non-privileged (regular) member attempting this operation must receive an
 *   authorization error, and the target post version must remain unaffected.
 *
 * Steps:
 *
 * 1. Register two users (for clarity/future use): a regular member and a second
 *    user (e.g., for moderator logic).
 * 2. As the regular member, create a topic via the member endpoint.
 * 3. Under that topic, create a thread.
 * 4. In that thread, create a post.
 * 5. Add a version to that post as the regular member.
 * 6. Attempt to delete the version using the moderator endpoint, still as the
 *    regular member (should fail).
 * 7. Assert permission denial error is thrown (TestValidator.error).
 * 8. (Optional) Comment: since there is no direct version read API, we cannot
 *    programmatically verify persistence, but a real suite might extend here if
 *    API expands.
 */
export async function test_api_discussionBoard_test_delete_post_version_by_non_privileged_user_should_fail(
  connection: api.IConnection,
) {
  // 1. Register a regular member (non-moderator, used for all operations below).
  const member_identifier: string = RandomGenerator.alphaNumeric(16); // Unique identifier for the member.
  const join_datetime: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member_identifier,
        joined_at: join_datetime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // Note: If the system requires explicit login/auth as this member, this step would go here. Otherwise, assume context or skip.

  // 2. Create a topic as this regular member.
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: null,
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 3. Create a thread in the topic.
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

  // 4. Create a post in the thread.
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(1),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Add a new version to the post.
  const version =
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
  typia.assert(version);

  // 6. Attempt to delete this version via moderator endpoint as the regular member - must fail with permission error.
  await TestValidator.error(
    "non-privileged member cannot delete post version via moderator endpoint",
  )(
    async () =>
      await api.functional.discussionBoard.moderator.posts.versions.erase(
        connection,
        {
          postId: post.id,
          versionId: version.id,
        },
      ),
  );

  // 7. (Optional) - No direct read API for version listing/confirm. In a full system, would verify version is still present.
}
