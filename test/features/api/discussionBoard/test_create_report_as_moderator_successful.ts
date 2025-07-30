import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test that a moderator can create a moderation report successfully.
 *
 * This test validates that a user with moderator privileges is able to submit
 * moderation reports for both posts and comments. The test will:
 *
 * 1. Prepare a moderator ID and simulate having moderator authentication (assume
 *    the provided connection context has such privileges).
 * 2. Test report creation for a post, building all required fields and verifying
 *    the logical integrity of the API response.
 * 3. Test report creation for a comment with a separate payload, again confirming
 *    all business rules and type integrity.
 * 4. For both cases, assert all critical fields (IDs, type, reason, and status)
 *    and schema validation.
 *
 * This workflow ensures both accepted content types and path logic are
 * validated, and the API reliably enforces its specification for moderator
 * report creation.
 */
export async function test_api_discussionBoard_test_create_report_as_moderator_successful(
  connection: api.IConnection,
) {
  // 1. Prepare moderator/user context (assume moderator privileges here)
  const moderatorId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare and submit a report for a post
  const postId = typia.random<string & tags.Format<"uuid">>();
  const reportBodyPost: IDiscussionBoardReport.ICreate = {
    reporter_id: moderatorId,
    content_type: "post",
    reported_post_id: postId,
    reported_comment_id: null,
    reason: "Flagging this post for potential rule violations.",
  };

  const outputPost =
    await api.functional.discussionBoard.moderator.reports.create(connection, {
      body: reportBodyPost,
    });
  typia.assert(outputPost);
  TestValidator.equals("reporter_id")(outputPost.reporter_id)(moderatorId);
  TestValidator.equals("content_type")(outputPost.content_type)("post");
  TestValidator.equals("reported_post_id")(outputPost.reported_post_id)(postId);
  TestValidator.equals("reported_comment_id")(outputPost.reported_comment_id)(
    null,
  );
  TestValidator.equals("reason")(outputPost.reason)(
    "Flagging this post for potential rule violations.",
  );
  TestValidator.equals("status")(outputPost.status)("pending");

  // 3. Prepare and submit a report for a comment
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const reportBodyComment: IDiscussionBoardReport.ICreate = {
    reporter_id: moderatorId,
    content_type: "comment",
    reported_post_id: null,
    reported_comment_id: commentId,
    reason: "Flagging this comment for inappropriate content.",
  };

  const outputComment =
    await api.functional.discussionBoard.moderator.reports.create(connection, {
      body: reportBodyComment,
    });
  typia.assert(outputComment);
  TestValidator.equals("reporter_id")(outputComment.reporter_id)(moderatorId);
  TestValidator.equals("content_type")(outputComment.content_type)("comment");
  TestValidator.equals("reported_post_id")(outputComment.reported_post_id)(
    null,
  );
  TestValidator.equals("reported_comment_id")(
    outputComment.reported_comment_id,
  )(commentId);
  TestValidator.equals("reason")(outputComment.reason)(
    "Flagging this comment for inappropriate content.",
  );
  TestValidator.equals("status")(outputComment.status)("pending");
}
