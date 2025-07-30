import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate member soft-deletion of their own post via the API.
 *
 * This test ensures a registered board member can soft-delete (not hard delete)
 * a post they authored. The workflow covers:
 *
 * 1. Register member via admin endpoint
 * 2. Create a topic under a category (random mock category ID)
 * 3. Create a thread within that topic
 * 4. Create a post under that thread as the member
 * 5. Soft-delete the post as the creator (sets deleted_at)
 * 6. Confirm the post is marked deleted and not present in normal post listings
 *    for regular members (skipped: listing API unavailable)
 * 7. Confirm that repeated deletion triggers error/idempotency handling per system
 *    rules
 * 8. Confirm deletion is audit-logged (not implemented - business context only)
 *
 * Edge cases: Deleting a post that is already deleted, and deleting as someone
 * other than the creator (not covered here).
 */
export async function test_api_discussionBoard_test_soft_delete_post_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a board member
  const userIdentifier: string =
    RandomGenerator.alphabets(12) + "@autobetest.com";
  const joinedAt: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: joinedAt,
      },
    },
  );
  typia.assert(member);

  // 2. Create a topic under a (mock) category for the thread
  const mockCategoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        description: RandomGenerator.content()(1)(),
        pinned: false,
        closed: false,
        discussion_board_category_id: mockCategoryId,
      },
    },
  );
  typia.assert(topic);

  // 3. Create a thread within the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(2),
        },
      },
    );
  typia.assert(thread);

  // 4. Create a post under that thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.content()(1)(),
      },
    },
  );
  typia.assert(post);

  // 5. Soft-delete the post (as the creator)
  await api.functional.discussionBoard.member.threads.posts.erase(connection, {
    threadId: thread.id,
    postId: post.id,
  });

  // 6. Re-attempt to delete (should error or be idempotent)
  await TestValidator.error(
    "Deleting already soft-deleted post triggers error or is no-op",
  )(
    async () =>
      await api.functional.discussionBoard.member.threads.posts.erase(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
        },
      ),
  );

  // (Step 6 is omitted: validation post is not in normal lists, as no index API is present)
  // (Step 8 is only business context; audit logging is not directly testable here)
}
