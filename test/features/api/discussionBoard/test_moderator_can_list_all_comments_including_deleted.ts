import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate that a moderator can retrieve the complete list of discussion board
 * comments, including both active and deleted comments, and that only permitted
 * fields are visible.
 *
 * This test covers business requirements that moderators:
 *
 * - See both active and soft-deleted (is_deleted=true) comments in the listing
 * - See only allowed summary info for each comment (no sensitive/private info)
 * - Pagination/summary structure is correct if present
 *
 * Steps:
 *
 * 1. Create a board member (via admin API, to allow creation of discussion
 *    content)
 * 2. As member, create a topic
 * 3. As member, create a thread within the topic
 * 4. As member, create a post under the thread
 * 5. As member, add two comments to the post
 * 6. Mark one comment as deleted (soft delete, is_deleted=true)
 * 7. As moderator, list all comments
 * 8. Validate that:
 *
 *    - Both comments (active and deleted) appear
 *    - Both are visible with expected fields (summary, no extra info)
 *    - Is_deleted status matches expected
 *    - No sensitive/private fields are present
 */
export async function test_api_discussionBoard_test_moderator_can_list_all_comments_including_deleted(
  connection: api.IConnection,
) {
  // 1. Create a board member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. As member, create a topic (simulate as same connection)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 3. As member, create a thread in the topic
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

  // 4. As member, create a post under the thread
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

  // 5. As member, add two comments
  const comment1 = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: post.id,
        content: RandomGenerator.content()()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment1);

  const comment2 = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: post.id,
        content: RandomGenerator.content()()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment2);

  // 6. Mark comment2 as deleted
  const deletedComment2 =
    await api.functional.discussionBoard.member.comments.update(connection, {
      commentId: comment2.id,
      body: {
        is_deleted: true,
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(deletedComment2);
  TestValidator.predicate("comment2 marked deleted")(
    deletedComment2.is_deleted === true,
  );

  // 7. As moderator, list all comments
  const listedSummary =
    await api.functional.discussionBoard.moderator.comments.index(connection);
  typia.assert(listedSummary);

  // 8. Validate that both comments (one deleted, one active) appear in the list, correct fields and no sensitive info
  // Since index API returns a summary (not array), wrap for uniform handling
  const allSummaries: IDiscussionBoardComment.ISummary[] = Array.isArray(
    listedSummary,
  )
    ? listedSummary
    : [listedSummary];

  // Check that at least both of our comments appear, and is_deleted status matches what we set
  const found1 = allSummaries.find((c) => c.id === comment1.id);
  const found2 = allSummaries.find((c) => c.id === comment2.id);
  TestValidator.predicate("active comment appears")(
    !!found1 && found1.is_deleted === false,
  );
  TestValidator.predicate("deleted comment appears")(
    !!found2 && found2.is_deleted === true,
  );

  // Validate returned summary fields -- check that fields match ISummary, and no extra properties
  for (const summary of allSummaries) {
    const allowedKeys = [
      "id",
      "discussion_board_member_id",
      "discussion_board_post_id",
      "content",
      "is_deleted",
      "created_at",
      "updated_at",
    ];
    for (const key of Object.keys(summary)) {
      TestValidator.predicate(`no extra field: ${key}`)(
        allowedKeys.includes(key),
      );
    }
  }
}
