import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";

/**
 * Validates the admin flag report review and status update API, covering
 * both valid and error scenarios.
 *
 * Ensures that an authenticated admin can update the status and review
 * details of a content flag report, and that business errors are raised for
 * non-existent reports or invalid state transitions.
 *
 * Process:
 *
 * 1. Register an admin using /auth/admin/join (setup authentication context).
 * 2. Simulate an existing flag report (using typia.random as a stand-in for
 *    fixture setup).
 * 3. Use the admin context to update the status/reviewer notes of this report,
 *    and validate all key audit and business fields reflect the change.
 * 4. Attempt to update a non-existent report and confirm error is raised.
 * 5. Attempt to update with an invalid status value and confirm a business
 *    error results.
 */
export async function test_api_admin_flag_report_review_and_status_update(
  connection: api.IConnection,
) {
  // 1. Register a new admin for authentication context
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // Admin session now established in connection.headers

  // 2. Simulate an existing flag report (in production, this would be a fixture or created record)
  const flagReport: IDiscussionBoardFlagReport =
    typia.random<IDiscussionBoardFlagReport>();

  // 3. Generate new moderation status and note for update
  const updateBody: IDiscussionBoardFlagReport.IUpdate = {
    status: RandomGenerator.pick([
      "triaged",
      "accepted",
      "dismissed",
      "escalated",
    ] as const),
    reviewedAt: new Date().toISOString(),
    details: RandomGenerator.paragraph({ sentences: 5 }),
  };

  // 4. Update the report and validate changes
  const updated = await api.functional.discussionBoard.admin.flagReports.update(
    connection,
    {
      flagReportId: flagReport.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "updated report status is correct",
    updated.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated reviewer note is correct",
    updated.details,
    updateBody.details,
  );
  TestValidator.predicate(
    "reviewedAt and updatedAt are at least as recent as update time",
    new Date(updated.updatedAt) >=
      new Date(updateBody.reviewedAt ?? "1970-01-01T00:00:00Z") &&
      (updated.reviewedAt === undefined ||
        new Date(updated.reviewedAt) >=
          new Date(updateBody.reviewedAt ?? "1970-01-01T00:00:00Z")),
  );

  // 5. Attempt to update a nonexistent flag report (expect error)
  await TestValidator.error(
    "update of non-existent flag report throws error",
    async () => {
      await api.functional.discussionBoard.admin.flagReports.update(
        connection,
        {
          flagReportId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 6. Attempt update with obviously invalid status (e.g., triggers business logic validation failure)
  await TestValidator.error(
    "update with invalid status returns error",
    async () => {
      await api.functional.discussionBoard.admin.flagReports.update(
        connection,
        {
          flagReportId: flagReport.id,
          body: { status: "invalid_status" },
        },
      );
    },
  );
}
