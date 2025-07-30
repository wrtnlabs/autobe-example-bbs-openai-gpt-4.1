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
 * Validate moderator's ability to filter and paginate comments by deleted
 * status and date windows.
 *
 * This test ensures that the moderator comments search endpoint correctly
 * filters comments using:
 *
 * - Is_deleted (true/false)
 * - Created_at/updated_at time windows
 * - Supports proper pagination and edge case handling (no matches)
 *
 * Workflow:
 *
 * 1. Add a test member (unique user_identifier for isolation).
 * 2. Create a topic in a random test category.
 * 3. Create a thread within the topic.
 * 4. Create a post in that thread.
 * 5. Add two comments to the post by the created member.
 * 6. Soft-delete the second comment.
 * 7. As moderator, verify comment search by: a. is_deleted: true (should find only
 *    deleted comment) b. is_deleted: false (should find only not-deleted
 *    comment) c. created_at_from/to window (should find correct comment) d.
 *    updated_at_from/to edge case (should match updated comment) e. Add
 *    negative test (future-date range yields no matches)
 * 8. Assert pagination/data structure and correctness in all cases.
 */
export async function test_api_discussionBoard_test_moderator_filter_comments_by_deleted_status_and_date(
  connection: api.IConnection,
) {
  // 1. Register an isolated test member
  const userIdentifier = `test_moderator_filter_${RandomGenerator.alphaNumeric(8)}`;
  const registeredMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: userIdentifier,
        joined_at: new Date().toISOString(),
      },
    });
  typia.assert(registeredMember);

  // 2. Create a topic in a new category (random UUID)
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const topicTitle = `FilterModTopic_${RandomGenerator.alphabets(5)}`;
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topicTitle,
        description: "E2E topic for moderator filter test.",
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      },
    },
  );
  typia.assert(topic);

  // 3. Create a thread in the topic
  const threadName = `T${RandomGenerator.alphaNumeric(4)}`;
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: threadName,
        },
      },
    );
  typia.assert(thread);

  // 4. Create a post in the thread
  const postBody = `Moderator filter comment test post at ${new Date().toISOString()}`;
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: postBody,
      },
    },
  );
  typia.assert(post);

  // 5. Add two comments, by the new member
  const firstCommentText = `Comment #1 for filter test (${new Date().toISOString()})`;
  const firstComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: registeredMember.id,
        discussion_board_post_id: post.id,
        content: firstCommentText,
      },
    });
  typia.assert(firstComment);

  const secondCommentText = `Comment #2 for filter test (${new Date().toISOString()})`;
  const secondComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: registeredMember.id,
        discussion_board_post_id: post.id,
        content: secondCommentText,
      },
    });
  typia.assert(secondComment);

  // 6. Soft-delete the second comment
  const deletedSecond =
    await api.functional.discussionBoard.member.comments.update(connection, {
      commentId: secondComment.id,
      body: { is_deleted: true },
    });
  typia.assert(deletedSecond);
  TestValidator.predicate("2nd comment should be deleted")(
    deletedSecond.is_deleted,
  );

  // 7a. Search is_deleted: true
  const deletedSearch =
    await api.functional.discussionBoard.moderator.comments.search(connection, {
      body: {
        is_deleted: true,
        post_id: post.id,
      },
    });
  typia.assert(deletedSearch);
  TestValidator.equals("deleted search - count")(deletedSearch.data.length)(1);
  TestValidator.equals("deleted search - id")(deletedSearch.data[0].id)(
    secondComment.id,
  );
  TestValidator.equals("is_deleted")(deletedSearch.data[0].is_deleted)(true);
  TestValidator.equals("author & post for deleted")(
    deletedSearch.data[0].discussion_board_member_id,
  )(registeredMember.id);
  TestValidator.equals("post id for deleted")(
    deletedSearch.data[0].discussion_board_post_id,
  )(post.id);

  // 7b. Search is_deleted: false
  const activeSearch =
    await api.functional.discussionBoard.moderator.comments.search(connection, {
      body: {
        is_deleted: false,
        post_id: post.id,
      },
    });
  typia.assert(activeSearch);
  TestValidator.equals("not-deleted search - count")(activeSearch.data.length)(
    1,
  );
  TestValidator.equals("not-deleted search - id")(activeSearch.data[0].id)(
    firstComment.id,
  );
  TestValidator.equals("is_deleted false")(activeSearch.data[0].is_deleted)(
    false,
  );
  TestValidator.equals("author & post for non-deleted")(
    activeSearch.data[0].discussion_board_member_id,
  )(registeredMember.id);
  TestValidator.equals("post id for non-deleted")(
    activeSearch.data[0].discussion_board_post_id,
  )(post.id);

  // 7c. Search by created_at window (exact time of first comment)
  const cwinFrom = firstComment.created_at;
  const cwinTo = firstComment.created_at;
  const timeFiltered =
    await api.functional.discussionBoard.moderator.comments.search(connection, {
      body: {
        post_id: post.id,
        created_at_from: cwinFrom,
        created_at_to: cwinTo,
      },
    });
  typia.assert(timeFiltered);
  const ids = timeFiltered.data.map((c) => c.id);
  TestValidator.predicate("created_at window yields at least first comment")(
    ids.includes(firstComment.id),
  );

  // 7d. Search by updated_at window (for deleted - updated_at should reflect the deletion)
  const updatedFrom = deletedSecond.updated_at;
  const updatedTo = deletedSecond.updated_at;
  const updatedFiltered =
    await api.functional.discussionBoard.moderator.comments.search(connection, {
      body: {
        post_id: post.id,
        updated_at_from: updatedFrom,
        updated_at_to: updatedTo,
      },
    });
  typia.assert(updatedFiltered);
  const updatedIDs = updatedFiltered.data.map((d) => d.id);
  TestValidator.predicate("updated_at window yields deleted comment")(
    updatedIDs.includes(secondComment.id),
  );

  // 7e. Edge case: future date range (no matches expected)
  const futureFrom = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const futureTo = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  const noMatchSearch =
    await api.functional.discussionBoard.moderator.comments.search(connection, {
      body: {
        post_id: post.id,
        is_deleted: true,
        created_at_from: futureFrom,
        created_at_to: futureTo,
      },
    });
  typia.assert(noMatchSearch);
  TestValidator.equals("future window yields nothing")(
    noMatchSearch.data.length,
  )(0);
}
