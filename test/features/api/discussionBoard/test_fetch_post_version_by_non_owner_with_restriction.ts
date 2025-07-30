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
 * E2E Test: Validate business logic restricting post version snapshot access
 * (ownership enforcement)
 *
 * This test verifies that a non-owner member cannot fetch version snapshots of
 * another member's post if business rules restrict such access on the
 * discussion board. Specifically, the test ensures:
 *
 * - Only the owner of a post (or authorized roles) can retrieve specific version
 *   snapshots
 * - Unauthorized access attempts by other board members result in forbidden
 *   (authorization) errors
 *
 * **Workflow:**
 *
 * 1. Register two board members: one as the post owner, and one as the non-owner.
 * 2. (Owner) Create a topic in a simulated category, then add a thread.
 * 3. (Owner) Create a post in the thread.
 * 4. (Owner) Produce a post version (edit snapshot).
 * 5. (Non-owner) Attempt to fetch this post version (by postId and versionId).
 * 6. Confirm that forbidden access is correctly enforced and reported as an error.
 */
export async function test_api_discussionBoard_test_fetch_post_version_by_non_owner_with_restriction(
  connection: api.IConnection,
) {
  // 1. Register the post owner (Member 1)
  const ownerUserIdentifier: string = RandomGenerator.alphaNumeric(14);
  const memberOwner = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: ownerUserIdentifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(memberOwner);

  // 2. Register a non-owner (Member 2)
  const attackerUserIdentifier: string = RandomGenerator.alphaNumeric(15);
  const memberAttacker =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: attackerUserIdentifier,
        joined_at: new Date().toISOString(),
      },
    });
  typia.assert(memberAttacker);

  // 3. Create a topic (as owner - simulated by sequence only)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(10),
        description: RandomGenerator.paragraph()(10),
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      },
    },
  );
  typia.assert(topic);

  // 4. Create a thread in the topic (as owner)
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(8),
        },
      },
    );
  typia.assert(thread);

  // 5. Create a post in the thread (as owner)
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(15),
      },
    },
  );
  typia.assert(post);

  // 6. Produce a post version (edit snapshot)
  const postVersion =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: RandomGenerator.paragraph()(17),
        },
      },
    );
  typia.assert(postVersion);

  // 7. Simulate attacker: attempt to fetch version snapshot as non-owner
  await TestValidator.error(
    "Non-owner cannot fetch version snapshot of another user's post",
  )(async () => {
    await api.functional.discussionBoard.member.posts.versions.at(connection, {
      postId: post.id,
      versionId: postVersion.id,
    });
  });
}
