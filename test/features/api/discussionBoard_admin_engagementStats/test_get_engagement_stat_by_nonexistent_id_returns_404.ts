import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";

/**
 * Validate that querying a nonexistent discussion board engagement stat ID
 * returns a 404 error.
 *
 * Administrators may attempt to fetch engagement statistics by specific UUID,
 * but if an invalid or non-existing engagementStatId is used, the API must not
 * return stats for another record and must signal not-found in a safe way.
 *
 * Steps:
 *
 * 1. Use a randomly generated UUID (which doesn't exist in this test DB) for
 *    engagementStatId
 * 2. Attempt to retrieve the engagement stat via GET
 *    /discussionBoard/admin/engagementStats/{engagementStatId}
 * 3. System should throw an error (typically 404 Not Found)
 * 4. Confirm that no statistical data structure is returned (i.e., no accidental
 *    data leak)
 * 5. (Optional) Confirm the error type is HttpError and the status field is 404
 *    when possible
 */
export async function test_api_discussionBoard_admin_engagementStats_test_get_engagement_stat_by_nonexistent_id_returns_404(
  connection: api.IConnection,
) {
  // 1. Use a random UUID for non-existent stat
  const nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Try to retrieve stat & expect error
  await TestValidator.error("not found for non-existent engagement stat")(
    async () => {
      await api.functional.discussionBoard.admin.engagementStats.at(
        connection,
        {
          engagementStatId: nonexistentId,
        },
      );
    },
  );
}
