import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates advanced content flag searching capabilities from the
 * moderator/admin dashboard.
 *
 * This test verifies a moderator or admin can query content flags with advanced
 * search parameters:
 *
 * - Filtering by type (e.g., 'spam', 'abuse')
 * - Filtering by different creation time windows
 * - Handling empty result sets on narrow windows
 *
 * Steps:
 *
 * 1. Prepare content flags with diverse types and timestamps via repeated create
 *    endpoint calls.
 * 2. Query for a specific flag type over a broad time range, and validate all
 *    returned have expected type.
 * 3. Query with a tight date window that matches only some flags, and ensure only
 *    those are returned.
 * 4. Run a query for a type and time range with no matches, expect data=[] with
 *    accurate pagination.
 * 5. Validate that pagination metadata corresponds to the result and query
 *    request.
 */
export async function test_api_discussionBoard_test_advanced_search_content_flags_by_flag_type_and_date_range(
  connection: api.IConnection,
) {
  // 1. Create multiple content flags with varied types and timestamps
  const now = new Date();
  const flagTypes = ["spam", "abuse", "duplicate"];
  const testFlags: IDiscussionBoardContentFlag[] = [];

  for (let i = 0; i < 9; ++i) {
    const type = flagTypes[i % flagTypes.length];
    // Spread timestamps over 'now' +/- up to several days
    // Actual `created_at` is set by the server but will be clustered chronologically
    const flag =
      await api.functional.discussionBoard.moderator.contentFlags.create(
        connection,
        {
          body: {
            flag_type: type,
            flag_source: "manual",
            flag_details: `Test generated type ${type} (${i})`,
          } satisfies IDiscussionBoardContentFlag.ICreate,
        },
      );
    typia.assert(flag);
    testFlags.push(flag);
  }

  // 2. Filter: Fetch all 'spam' flags over broad time
  const rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let result =
    await api.functional.discussionBoard.moderator.contentFlags.search(
      connection,
      {
        body: {
          flag_type: "spam",
          created_at_from: rangeStart.toISOString() as string &
            tags.Format<"date-time">,
          created_at_to: rangeEnd.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(result);
  for (const flag of result.data) {
    TestValidator.equals("should match spam type")(flag.flag_type)("spam");
    const cAt = new Date(flag.created_at);
    TestValidator.predicate("created_at within broad range")(
      cAt >= rangeStart && cAt <= rangeEnd,
    );
  }

  // 3. Filter: Tight window catches only some
  const tightWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tightWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  result = await api.functional.discussionBoard.moderator.contentFlags.search(
    connection,
    {
      body: {
        created_at_from: tightWindowStart.toISOString() as string &
          tags.Format<"date-time">,
        created_at_to: tightWindowEnd.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardContentFlag.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate("flags in tight window")(
    result.data.every((flag) => {
      const cAt = new Date(flag.created_at);
      return cAt >= tightWindowStart && cAt <= tightWindowEnd;
    }),
  );

  // 4. Filter: No match window
  const noResultsStart = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const noResultsEnd = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
  result = await api.functional.discussionBoard.moderator.contentFlags.search(
    connection,
    {
      body: {
        created_at_from: noResultsStart.toISOString() as string &
          tags.Format<"date-time">,
        created_at_to: noResultsEnd.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardContentFlag.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.equals("no results for distant window")(result.data.length)(0);
  TestValidator.equals("page 1 for empty result")(result.pagination.current)(1);

  // 5. Pagination check
  TestValidator.predicate("pagination matches result size")(
    result.pagination.records === result.data.length &&
      result.pagination.current === 1,
  );
}
