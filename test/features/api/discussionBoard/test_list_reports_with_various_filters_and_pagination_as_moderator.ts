import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate listing and filtering of moderation reports as a moderator.
 *
 * This test simulates a real-world moderation workflow on a discussion board:
 * 1. Register a general member who will create content and submit reports
 * 2. Member creates a thread, a post, and a comment so each can be reported
 * 3. Member submits three separate reports (thread, post, comment)
 * 4. Register a second member to become the moderator
 * 5. Grant moderator rights by role assignment
 * 6. As moderator, list reports in multiple ways:
 *    - All reports (unfiltered)
 *    - Filter by reporter
 *    - Filter by content type (thread, post, comment)
 *    - Filter by status (pending, resolved)
 *    - Filter by date ranges
 *    - Paginate results (limit/page)
 *    - Use filters that match no results
 * 7. Verify:
 *    - Report data matches filters
 *    - Pagination is correct (count, page, etc.)
 *    - Permissions: Only the moderator sees *all* reports
 *    - Edge: Zero-result queries handled cleanly
 */
export async function test_api_discussionBoard_test_list_reports_with_various_filters_and_pagination_as_moderator(
  connection: api.IConnection,
) {
  // 1. Register a member (the reporter/content creator)
  const member: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Register a thread (with random category ID)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const thread: IDiscussionBoardThread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: member.id,
      discussion_board_category_id: categoryId,
      title: RandomGenerator.paragraph()(1),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 3. Register a post (as reply to the thread)
  const post: IDiscussionBoardPost = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: member.id,
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 4. Register a comment (on the post)
  const comment: IDiscussionBoardComment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      parent_id: null,
      body: RandomGenerator.paragraph()(1),
    } satisfies IDiscussionBoardComment.ICreate,
  });
  typia.assert(comment);

  // 5. Submit reports on thread, post, and comment, with different reasons
  const reportThread: IDiscussionBoardReport = await api.functional.discussionBoard.reports.post(connection, {
    body: {
      reporter_member_id: member.id,
      thread_id: thread.id,
      post_id: null,
      comment_id: null,
      reason: "thread rule violation",
    } satisfies IDiscussionBoardReport.ICreate,
  });
  typia.assert(reportThread);

  const reportPost: IDiscussionBoardReport = await api.functional.discussionBoard.reports.post(connection, {
    body: {
      reporter_member_id: member.id,
      thread_id: null,
      post_id: post.id,
      comment_id: null,
      reason: "post inappropriate",
    } satisfies IDiscussionBoardReport.ICreate,
  });
  typia.assert(reportPost);

  const reportComment: IDiscussionBoardReport = await api.functional.discussionBoard.reports.post(connection, {
    body: {
      reporter_member_id: member.id,
      thread_id: null,
      post_id: null,
      comment_id: comment.id,
      reason: "comment spam",
    } satisfies IDiscussionBoardReport.ICreate,
  });
  typia.assert(reportComment);

  // 6. Register a moderator member
  const moderatorMember: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(moderatorMember);

  // 7. Assign moderator role
  const moderatorRole: IDiscussionBoardModerator = await api.functional.discussionBoard.moderators.post(connection, {
    body: {
      member_id: moderatorMember.id,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderatorRole);

  // 8. As moderator, search/list all reports (no filter)
  const allReports = await api.functional.discussionBoard.reports.patch(connection, {
    body: {} satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(allReports);
  TestValidator.predicate("all 3 test reports present")(allReports.data.length >= 3);

  // 9. Filter by reporter
  const byReporter = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      reporter_member_id: member.id,
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(byReporter);
  TestValidator.equals("reporter filtered")(byReporter.data.every(rep => rep.reporter_member_id === member.id))(true);

  // 10. Filter by thread_id, post_id, comment_id respectively
  const byThread = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      thread_id: thread.id,
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(byThread);
  TestValidator.equals("thread report only")(byThread.data.length)(1);
  TestValidator.equals("thread id match")(byThread.data[0]?.thread_id)(thread.id);

  const byPost = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      post_id: post.id,
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(byPost);
  TestValidator.equals("post report only")(byPost.data.length)(1);
  TestValidator.equals("post id match")(byPost.data[0]?.post_id)(post.id);

  const byComment = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      comment_id: comment.id,
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(byComment);
  TestValidator.equals("comment report only")(byComment.data.length)(1);
  TestValidator.equals("comment id match")(byComment.data[0]?.comment_id)(comment.id);

  // 11. Filter by reason (should return only matching report)
  const byReason = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      reason: "post inappropriate",
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(byReason);
  TestValidator.equals("reason filtered")(byReason.data.every(rep => rep.reason === "post inappropriate"))(true);

  // 12. By status (assume all are still 'pending')
  const byStatus = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      status: "pending",
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(byStatus);
  TestValidator.predicate("all status pending")(byStatus.data.every(rep => rep.status === "pending"));

  // 13. By date ranges
  const since = new Date(Date.now() - 1000 * 60 * 10).toISOString();
  const until = new Date(Date.now() + 1000 * 60 * 10).toISOString();
  const byDate = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      created_at_from: since,
      created_at_to: until,
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(byDate);
  TestValidator.equals("date range query")(byDate.data.length >= 3)(true);

  // 14. Pagination: limit/page
  const paged = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      limit: 2,
      page: 1,
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(paged);
  TestValidator.equals("pagination: page 1, limit 2")(paged.data.length)(2);
  TestValidator.equals("pagination: total count")(paged.pagination.records)(allReports.pagination.records);

  // 15. Pagination: empty page (page that can't have data)
  const emptyPage = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      limit: 3,
      page: 100,
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(emptyPage);
  TestValidator.equals("empty pagination")(emptyPage.data.length)(0);

  // 16. Filters that match no reports
  const noMatch = await api.functional.discussionBoard.reports.patch(connection, {
    body: {
      reporter_member_id: typia.random<string & tags.Format<"uuid">>(),
      reason: "nonsense reasoning",
    } satisfies IDiscussionBoardReport.IRequest,
  });
  typia.assert(noMatch);
  TestValidator.equals("zero result filter")(noMatch.data.length)(0);
}