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
 * Validate that an admin can retrieve all discussion board comments (active and
 * deleted).
 *
 * BUSINESS CONTEXT: Board admins require the ability to view the complete list
 * of comments (both active and soft-deleted) for moderation and audit purposes.
 * This test verifies admin privileges in retrieving comment summaries and the
 * visibility of deletion markers.
 *
 * TEST STEPS:
 *
 * 1. Create a new board member (to serve as the author of test comments).
 * 2. Post a new topic using the test member.
 * 3. Under the topic, create a thread using the test member.
 * 4. Add a post to the thread using the test member.
 * 5. Create two comments under the new post (one active, one to be soft-deleted).
 * 6. Soft-delete the second comment.
 * 7. As an admin, call the API to list all comments (GET
 *    /discussionBoard/admin/comments).
 * 8. Assert that both the active and deleted comments appear in the response
 *    (using summary fields), that the appropriate is_deleted flags are present,
 *    and that at least one deleted and one active comment exist.
 * 9. Validate summary fields (ID, content, author, parent post, timestamps,
 *    is_deleted flag) for basic correctness.
 * 10. Verify no sensitive/forbidden data (such as passwords) are present in the
 *     comment summaries.
 *
 * Notes:
 *
 * - This test assumes a stateful test DB and context propagation for admin/member
 *   APIs.
 * - If session switching is required for admin endpoints, ensure admin context is
 *   established prior to admin calls.
 */
export async function test_api_discussionBoard_test_list_all_comments_with_active_and_deleted_content_for_admin(
  connection: api.IConnection,
) {
  // 1. Create a new board member (for use as comment author)
  const testMember = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: `testadmin_${RandomGenerator.alphaNumeric(10)}@test.local`,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(testMember);

  // 2. Post a topic with the test member
  const testCategoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(1),
        pinned: false,
        closed: false,
        discussion_board_category_id: testCategoryId,
      },
    },
  );
  typia.assert(topic);

  // 3. Create a thread in the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(1),
        },
      },
    );
  typia.assert(thread);

  // 4. Add a post to the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.content()()(),
      },
    },
  );
  typia.assert(post);

  // 5. Create two comments under the post (one active, one to be soft-deleted)
  const activeComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: testMember.id,
        discussion_board_post_id: post.id,
        content: RandomGenerator.content()()(),
      },
    });
  typia.assert(activeComment);

  const toBeDeletedComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: testMember.id,
        discussion_board_post_id: post.id,
        content: RandomGenerator.content()()(),
      },
    });
  typia.assert(toBeDeletedComment);

  // 6. Soft-delete the second comment
  const deletedComment =
    await api.functional.discussionBoard.member.comments.update(connection, {
      commentId: toBeDeletedComment.id,
      body: { is_deleted: true },
    });
  typia.assert(deletedComment);

  // 7. Retrieve all comments as admin
  const adminComments =
    await api.functional.discussionBoard.admin.comments.index(connection);
  typia.assert(adminComments);

  // 8. The API most likely returns a single ISummary or an array. Normalize for validation.
  const commentsArray = Array.isArray(adminComments)
    ? adminComments
    : [adminComments];

  const foundActive = commentsArray.find((c) => c.id === activeComment.id);
  const foundDeleted = commentsArray.find(
    (c) => c.id === toBeDeletedComment.id,
  );
  TestValidator.predicate("active comment is present and not deleted")(
    !!foundActive && foundActive.is_deleted === false,
  );
  TestValidator.predicate("deleted comment is present and is_deleted=true")(
    !!foundDeleted && foundDeleted.is_deleted === true,
  );

  // 9. Validate summary fields
  for (const c of [foundActive, foundDeleted]) {
    if (!c) throw new Error("Test comment not found by admin list");
    TestValidator.equals("author matches")(c.discussion_board_member_id)(
      testMember.id,
    );
    TestValidator.equals("parent post matches")(c.discussion_board_post_id)(
      post.id,
    );
    TestValidator.predicate("content string and nonempty")(
      typeof c.content === "string" && c.content.length > 0,
    );
    TestValidator.predicate("has created_at")(
      !!c.created_at && typeof c.created_at === "string",
    );
    TestValidator.predicate("has updated_at")(
      !!c.updated_at && typeof c.updated_at === "string",
    );
    const allowedSummaryFields = [
      "id",
      "discussion_board_member_id",
      "discussion_board_post_id",
      "content",
      "is_deleted",
      "created_at",
      "updated_at",
    ];
    Object.keys(c).forEach((k) => {
      TestValidator.predicate(`summary has no forbidden fields: ${k}`)(
        allowedSummaryFields.includes(k),
      );
    });
  }
}
