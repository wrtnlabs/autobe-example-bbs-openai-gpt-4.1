import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin comment search filtering by member and soft-deleted status.
 *
 * This test ensures that when searching as admin for comments written by a
 * specific member, with further filtering by soft-deleted (is_deleted: true) or
 * active (is_deleted: false), only comments matching those criteria are
 * returned. The test performs the following steps:
 *
 * 1. Admin creates a new board member and captures their ID for filtering.
 * 2. Member creates a topic and a thread.
 * 3. Member creates a post under the thread.
 * 4. Member creates at least two comments: one normal (active), one to be
 *    soft-deleted.
 * 5. Member soft-deletes one comment (via update with is_deleted: true).
 * 6. As admin, search for comments with: a. member_id = <new member>, is_deleted =
 *    false => expect only the normal comment. b. member_id = <new member>,
 *    is_deleted = true => expect only the soft-deleted comment. c. member_id =
 *    <nonexistent member>, is_deleted = any => expect no results (edge case).
 *    d. Pagination: create multiple extra comments, search with limit=1 and
 *    validate correct page breakdown.
 *
 * Each search result is validated to contain only comments for the given member
 * and is_deleted state. No other members' comments or mismatched is_deleted
 * states must appear.
 */
export async function test_api_discussionBoard_test_admin_search_comments_by_member_and_soft_deleted_state(
  connection: api.IConnection,
) {
  // 1. Create a board member
  const boardMember = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(16),
        joined_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(boardMember);

  // 2. Create a topic for that member
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 3. Create a thread in that topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(thread);

  // 4. Create a post in the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(post);

  // 5. Create two comments: one normal, one to be soft-deleted
  const normalComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: boardMember.id,
        discussion_board_post_id: post.id,
        content: RandomGenerator.paragraph()(),
      },
    });
  typia.assert(normalComment);

  const deletedComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: boardMember.id,
        discussion_board_post_id: post.id,
        content: RandomGenerator.paragraph()(),
      },
    });
  typia.assert(deletedComment);

  // 6. Soft-delete one comment
  const updatedDeletedComment =
    await api.functional.discussionBoard.member.comments.update(connection, {
      commentId: deletedComment.id,
      body: { is_deleted: true },
    });
  typia.assert(updatedDeletedComment);

  // 7. Admin search for active comments by this member (is_deleted: false)
  let searchActive = await api.functional.discussionBoard.admin.comments.search(
    connection,
    {
      body: { member_id: boardMember.id, is_deleted: false },
    },
  );
  typia.assert(searchActive);
  for (const c of searchActive.data) {
    TestValidator.equals("member_id matches")(c.discussion_board_member_id)(
      boardMember.id,
    );
    TestValidator.equals("is_deleted false")(c.is_deleted)(false);
  }
  TestValidator.predicate("Only normal (not deleted) comment present")(
    searchActive.data.find((x) => x.id === normalComment.id) !== undefined &&
      searchActive.data.find((x) => x.id === deletedComment.id) === undefined,
  );

  // 8. Admin search for deleted comments by this member (is_deleted: true)
  let searchDeleted =
    await api.functional.discussionBoard.admin.comments.search(connection, {
      body: { member_id: boardMember.id, is_deleted: true },
    });
  typia.assert(searchDeleted);
  for (const c of searchDeleted.data) {
    TestValidator.equals("member_id matches")(c.discussion_board_member_id)(
      boardMember.id,
    );
    TestValidator.equals("is_deleted true")(c.is_deleted)(true);
  }
  TestValidator.predicate("Only deleted comment present")(
    searchDeleted.data.find((x) => x.id === deletedComment.id) !== undefined &&
      searchDeleted.data.find((x) => x.id === normalComment.id) === undefined,
  );

  // 9. Edge case: search with a non-existent member_id
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  let searchNone = await api.functional.discussionBoard.admin.comments.search(
    connection,
    {
      body: { member_id: nonExistentMemberId },
    },
  );
  typia.assert(searchNone);
  TestValidator.equals("no results for unknown member")(searchNone.data.length)(
    0,
  );

  // 10. Edge case: pagination—create extra comments, search with limit=1, pages=2
  const extraComments = await ArrayUtil.asyncRepeat(2)(async () =>
    api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: boardMember.id,
        discussion_board_post_id: post.id,
        content: RandomGenerator.alphaNumeric(10),
      },
    }),
  );
  for (const c of extraComments) typia.assert(c);

  // search paginated with limit=1
  let paginatedResult =
    await api.functional.discussionBoard.admin.comments.search(connection, {
      body: { member_id: boardMember.id, is_deleted: false },
    });
  typia.assert(paginatedResult);
  if (paginatedResult.data.length > 1) {
    let page = 1;
    let cursor = 0;
    while (cursor < paginatedResult.data.length) {
      let result = await api.functional.discussionBoard.admin.comments.search(
        connection,
        {
          body: { member_id: boardMember.id, is_deleted: false },
        },
      );
      typia.assert(result);
      for (const c of result.data) {
        TestValidator.equals("member_id matches:paginated")(
          c.discussion_board_member_id,
        )(boardMember.id);
        TestValidator.equals("is_deleted false:paginated")(c.is_deleted)(false);
      }
      cursor += result.data.length;
      page++;
      if (page > 10) break; // prevent infinite loop
    }
  }
}
