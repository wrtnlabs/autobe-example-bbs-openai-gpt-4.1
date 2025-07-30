import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate that a moderator can update any thread within a topic, regardless of
 * the original creator.
 *
 * This test simulates a realistic forum workflow:
 *
 * 1. Register a new member (who will become the thread's creator)
 * 2. Register a new moderator (with separate identity)
 * 3. Create a topic (as admin)
 * 4. As the member, create a thread in that topic
 * 5. As the moderator, update the thread's title
 * 6. Verify that the update succeeds and audit fields are correct
 *
 * This ensures moderator privilege overrides thread ownership for editing
 * rights.
 */
export async function test_api_discussionBoard_test_update_thread_by_moderator_success(
  connection: api.IConnection,
) {
  // 1. Register a new board member (thread creator)
  const member_user_identifier = RandomGenerator.alphabets(12);
  const member_joined_at = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member_user_identifier,
        joined_at: member_joined_at,
      },
    },
  );
  typia.assert(member);

  // 2. Register a new moderator (separate identity)
  const moderator_user_identifier = RandomGenerator.alphabets(12);
  const moderator_granted_at = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderator_user_identifier,
        granted_at: moderator_granted_at,
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 3. Create a topic (as admin)
  const topic_title = RandomGenerator.alphabets(15);
  const topic_category_id = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title: topic_title,
        description: "Test topic for moderator update thread scenario.",
        pinned: false,
        closed: false,
        discussion_board_category_id: topic_category_id,
      },
    },
  );
  typia.assert(topic);

  // 4. As member, create a thread in the topic
  // (Assume role switching handled by test automation context)
  const thread_title = RandomGenerator.alphabets(16);
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: thread_title,
        },
      },
    );
  typia.assert(thread);

  // 5. As moderator, update the thread's title
  const new_thread_title = thread_title + "_updated";
  const updated_thread =
    await api.functional.discussionBoard.moderator.topics.threads.update(
      connection,
      {
        topicId: topic.id,
        threadId: thread.id,
        body: {
          title: new_thread_title,
        },
      },
    );
  typia.assert(updated_thread);

  // 6. Verify the changes and audit trail
  TestValidator.equals("thread id unchanged")(updated_thread.id)(thread.id);
  TestValidator.equals("topic relation unchanged")(
    updated_thread.discussion_board_topic_id,
  )(topic.id);
  TestValidator.equals("creator member unchanged")(
    updated_thread.creator_member_id,
  )(thread.creator_member_id);
  TestValidator.notEquals("title updated")(updated_thread.title)(thread.title);
  TestValidator.equals("title is as updated")(updated_thread.title)(
    new_thread_title,
  );
  TestValidator.predicate("updated_at not before created_at")(
    new Date(updated_thread.updated_at).getTime() >=
      new Date(thread.created_at).getTime(),
  );
  TestValidator.predicate("updated_at changes")(
    updated_thread.updated_at !== thread.updated_at,
  );
}
