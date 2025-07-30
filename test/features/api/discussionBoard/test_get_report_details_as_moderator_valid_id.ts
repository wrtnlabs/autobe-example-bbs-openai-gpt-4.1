import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validates that a moderator can retrieve and review a full report record by
 * reportId.
 *
 * This test ensures all fields (including any sensitive audit/moderation
 * attributes) are available as expected for in-depth moderation review.
 *
 * Full business flow:
 *
 * 1. A member submits a content report (either post or comment), receiving the
 *    system-generated reportId.
 * 2. A moderator fetches the detailed information for this reportId via the
 *    appropriate privileged endpoint.
 * 3. All returned fields (IDs, reason, state, timestamps, and resolved_at for
 *    completeness) must be present, non-empty, and consistent with creation
 *    values.
 * 4. The response is type- and business-validated.
 */
export async function test_api_discussionBoard_test_get_report_details_as_moderator_valid_id(
  connection: api.IConnection,
) {
  // 1. Member creates a moderation report (simulate a post report with minimal valid required fields)
  const reporterId: string = typia.random<string & tags.Format<"uuid">>();
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const reason: string = "Inappropriate content in post body";
  const createDto: IDiscussionBoardReport.ICreate = {
    reporter_id: reporterId,
    content_type: "post",
    reported_post_id: postId,
    reported_comment_id: null,
    reason,
  };
  const created: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: createDto,
    });
  typia.assert(created);

  // Validate returned fields after creation
  TestValidator.equals("reporter_id matches")(created.reporter_id)(reporterId);
  TestValidator.equals("content_type is post")(created.content_type)("post");
  TestValidator.equals("reported_post_id matches")(created.reported_post_id)(
    postId,
  );
  TestValidator.equals("reason matches")(created.reason)(reason);
  TestValidator.equals("pending status on creation")(created.status)("pending");
  TestValidator.predicate("created_at is present")(
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.equals("resolved_at default null")(created.resolved_at)(null);

  // 2. Moderator fetches the report using the detailed/moderator endpoint
  const detail: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.at(connection, {
      reportId: created.id,
    });
  typia.assert(detail);
  // Validate all fields (should match those from creation, and full detail should be visible)
  TestValidator.equals("report id matches")(detail.id)(created.id);
  TestValidator.equals("reporter_id")(detail.reporter_id)(reporterId);
  TestValidator.equals("content_type")(detail.content_type)("post");
  TestValidator.equals("reported_post_id")(detail.reported_post_id)(postId);
  TestValidator.equals("reported_comment_id should remain null")(
    detail.reported_comment_id,
  )(null);
  TestValidator.equals("reason")(detail.reason)(reason);
  TestValidator.equals("status pending before moderation")(detail.status)(
    "pending",
  );
  TestValidator.equals("resolved_at before moderation is null")(
    detail.resolved_at,
  )(null);
  TestValidator.predicate("created_at valid")(
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
}
