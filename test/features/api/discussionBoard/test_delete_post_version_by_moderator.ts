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
 * Verify a moderator can irreversibly hard-delete a post version snapshot.
 *
 * This test exercises the complete flow required to validate that a moderator
 * can remove a specific post version. The flow creates all dependencies: a
 * moderator, a regular member, a topic, thread, post, and a post version. The
 * moderator then performs a hard-delete, and an error is expected when trying
 * to retrieve the deleted version.
 *
 * Steps:
 *
 * 1. Create a moderator member (admin endpoint).
 * 2. Create a regular member for post actions.
 * 3. Create a topic (as regular member with valid category ID).
 * 4. Create a thread under the topic.
 * 5. Create a post in the thread.
 * 6. Create a new version for the post.
 * 7. As moderator, delete the post version.
 * 8. Confirm version cannot be found (simulate Not Found/error via
 *    list/filter/expected error).
 */
export async function test_api_discussionBoard_test_delete_post_version_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create moderator member (simulate admin session: "back office onboarding")
  const moderatorIdentifier = RandomGenerator.alphaNumeric(16);
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

  // 2. Create regular member for post ownership
  const memberIdentifier = RandomGenerator.alphaNumeric(18);
  const memberJoinTime = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberIdentifier,
        joined_at: memberJoinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 3. Member creates topic (need fake/typia-generated or known-good categoryId, use typia.random if not in scope)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(2),
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 4. Member creates thread in the topic
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

  // 5. Member posts in the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(3),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Member creates a version for that post
  const version =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: RandomGenerator.paragraph()(5),
        } satisfies IDiscussionBoardPostVersion.ICreate,
      },
    );
  typia.assert(version);

  // 7. Moderator HARD deletes this version as authorized role
  await api.functional.discussionBoard.moderator.posts.versions.erase(
    connection,
    {
      postId: post.id,
      versionId: version.id,
    },
  );

  // 8. Try to fetch the version again; since no API exists to get single version, attempt re-create, or expect error on list. Here we try to re-delete to simulate missing.
  await TestValidator.error(
    "should throw NotFound or similar for missing version",
  )(async () => {
    await api.functional.discussionBoard.moderator.posts.versions.erase(
      connection,
      {
        postId: post.id,
        versionId: version.id,
      },
    );
  });
}
