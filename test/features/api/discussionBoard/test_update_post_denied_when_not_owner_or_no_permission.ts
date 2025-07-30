import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate that non-owner members cannot update another user's post in a
 * discussion thread.
 *
 * This test covers access control and ownership enforcement:
 *
 * 1. Register two unique members (member1 and member2)
 * 2. Using member1's session, create a discussion topic
 * 3. Using member1's session, create a thread under the topic
 * 4. Using member1's session, create a post in that thread
 * 5. Using member2's session, attempt to update member1's post
 * 6. The system must reject the update from member2 (forbidden/unauthorized)
 * 7. Only moderators/admins are allowed to override (not tested here)
 *
 * Steps:
 *
 * 1. Create member1 via the admin endpoint, record credentials
 * 2. Create member2 via the admin endpoint, record credentials
 * 3. Create a topic while authenticated as member1
 * 4. Create a thread under the topic while authenticated as member1
 * 5. Create a post under the thread while authenticated as member1
 * 6. Attempt (as member2) to update the post (should fail), catch and validate
 *    error
 */
export async function test_api_discussionBoard_test_update_post_denied_when_not_owner_or_no_permission(
  connection: api.IConnection,
) {
  // 1. Create member1
  const member1_identifier = RandomGenerator.alphaNumeric(12);
  const member1_joined = new Date().toISOString();
  const member1 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member1_identifier,
        joined_at: member1_joined,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member1);

  // 2. Create member2
  const member2_identifier = RandomGenerator.alphaNumeric(12);
  const member2_joined = new Date().toISOString();
  const member2 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member2_identifier,
        joined_at: member2_joined,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member2);

  // 3. Create a topic as member1
  // (Assume that member authentication is context-bound through user_identifier, if required)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        description: RandomGenerator.paragraph()(3),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 4. Create a thread under the topic as member1
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

  // 5. Create a post under the thread as member1
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Attempt to update the post as member2 (should fail)
  // (Assume session switch by user_identifier; if not system controlled, would need explicit logins - skipped here)
  TestValidator.error("Non-owner cannot update another user's post")(
    async () => {
      await api.functional.discussionBoard.member.threads.posts.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            body: RandomGenerator.paragraph()(),
            is_edited: true,
          } satisfies IDiscussionBoardPost.IUpdate,
        },
      );
    },
  );
}
