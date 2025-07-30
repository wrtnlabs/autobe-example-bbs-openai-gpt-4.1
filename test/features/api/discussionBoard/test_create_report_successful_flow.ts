import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate the successful flow for a member reporting abusive or inappropriate
 * content.
 *
 * This test simulates a realistic moderation workflow:
 *
 * 1. Assume an authenticated member is present (provided via connection context).
 * 2. Ensure a target post exists to be reported (simulate with random UUID if
 *    creation is out of scope).
 * 3. Create a report for that post, setting the member as the reporter and
 *    specifying reason.
 * 4. Confirm the API returns the report in 'pending' status with correct
 *    associations.
 * 5. Validate response type and business logic (report links, reason, status).
 */
export async function test_api_discussionBoard_member_reports_create(
  connection: api.IConnection,
) {
  // Step 1: Prepare authenticated member (assumed via connection)
  const reporter_id = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Prepare a post to report (simulate an existing post ID)
  const reported_post_id = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a valid report for the post
  const createBody: IDiscussionBoardReport.ICreate = {
    reporter_id,
    content_type: "post",
    reported_post_id,
    reported_comment_id: null,
    reason: "Inappropriate language in the post body.",
  };

  const output: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: createBody,
    });
  typia.assert(output);

  // Step 4: Validate the persisted report
  TestValidator.equals("reporter_id matches")(output.reporter_id)(reporter_id);
  TestValidator.equals("reported_post_id matches")(output.reported_post_id)(
    reported_post_id,
  );
  TestValidator.equals("reported_comment_id is null")(
    output.reported_comment_id,
  )(null);
  TestValidator.equals("content_type is post")(output.content_type)("post");
  TestValidator.equals("reason matches")(output.reason)(
    "Inappropriate language in the post body.",
  );
  TestValidator.equals("status is pending")(output.status)("pending");
  TestValidator.predicate("created_at is ISO date-time string")(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(output.created_at),
  );
  TestValidator.equals("resolved_at is null for new reports")(
    output.resolved_at,
  )(null);
}
