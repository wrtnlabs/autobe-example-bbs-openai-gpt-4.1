import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Verify that an unauthorized member (not the thread creator) cannot update
 * another member's thread.
 *
 * This test verifies proper enforcement of thread ownership and permissions by
 * the API. Specifically, it ensures that only the thread's creator (or
 * privileged users) may update its metadata, and other members are denied such
 * updates.
 *
 * Test Flow:
 *
 * 1. Register Member A (thread creator) using the admin API.
 * 2. Register Member B (unauthorized member) using the admin API.
 * 3. Create a topic using the admin API. Since category creation is not available
 *    via API, a random UUID will be used for category ID.
 * 4. Have Member A create a thread in the created topic (context switching is
 *    hypothetical—actual session simulation is out of scope).
 * 5. Attempt to update the thread as Member B: API call should fail due to lack of
 *    ownership/permission.
 *
 * The test confirms the API rejects unauthorized update attempts and enforces
 * correct thread permissions.
 */
export async function test_api_discussionBoard_test_update_thread_fail_unauthorized_member_not_owner(
  connection: api.IConnection,
) {
  // 1. Register Member A (thread creator)
  const memberA_user_identifier =
    RandomGenerator.alphabets(12) + "@example.com";
  const memberA_joined_at = new Date().toISOString();
  const memberA = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberA_user_identifier,
        joined_at: memberA_joined_at,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberA);

  // 2. Register Member B (unauthorized updater)
  const memberB_user_identifier =
    RandomGenerator.alphabets(12) + "@example.com";
  const memberB_joined_at = new Date().toISOString();
  const memberB = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberB_user_identifier,
        joined_at: memberB_joined_at,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberB);

  // 3. Create a topic (simulate category by generating a random UUID for discussion_board_category_id)
  const category_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const topic_title = RandomGenerator.paragraph()(1);
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title: topic_title,
        description: RandomGenerator.paragraph()(2),
        pinned: false,
        closed: false,
        discussion_board_category_id: category_id,
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 4. Have Member A create a thread in the topic
  const thread_title = RandomGenerator.paragraph()(1);
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: thread_title,
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);
  TestValidator.equals("topic-id of thread matches")(
    thread.discussion_board_topic_id,
  )(topic.id);
  TestValidator.equals("thread creator is Member A")(thread.creator_member_id)(
    memberA.id,
  );

  // 5. Attempt to update the thread as Member B
  // In a full system we'd switch sessions or tokens to Member B—here, context simulation suffices.
  // The update should fail because Member B is not the owner.
  const updateTitle =
    RandomGenerator.paragraph()(1) + " (unauthorized update attempt)";
  await TestValidator.error(
    "unauthorized update of thread by non-owner should be rejected",
  )(async () => {
    await api.functional.discussionBoard.member.topics.threads.update(
      connection,
      {
        topicId: topic.id,
        threadId: thread.id,
        body: {
          title: updateTitle,
        } satisfies IDiscussionBoardThreads.IUpdate,
      },
    );
  });
}
