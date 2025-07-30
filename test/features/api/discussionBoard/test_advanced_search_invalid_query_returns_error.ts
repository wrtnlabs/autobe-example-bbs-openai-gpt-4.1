import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that advanced moderator search returns an error for invalid or
 * malformed queries.
 *
 * This test ensures the admin moderator search endpoint robustly handles
 * invalid requests (like unsupported fields or malformed date filters),
 * returning appropriate error responses and not leaking moderator records on
 * failures.
 *
 * Steps:
 *
 * 1. Submit a PATCH /discussionBoard/admin/moderators request with a logically
 *    invalid payload (e.g., an invalid date string in 'granted_at_from', or an
 *    impossible page number).
 * 2. Assert an error is thrown (TestValidator.error), and the returned data is not
 *    present.
 * 3. Repeat with another kind of invalidity (e.g., negative limit, string that
 *    cannot be parsed as date).
 * 4. For good measure, try a structurally valid but logically impossible filter
 *    (revoked_at_from after revoked_at_to) and confirm error.
 */
export async function test_api_discussionBoard_test_advanced_search_invalid_query_returns_error(
  connection: api.IConnection,
) {
  // 1. Test with invalid date format in 'granted_at_from' (malformed date string)
  await TestValidator.error("invalid date format should return error")(() =>
    api.functional.discussionBoard.admin.moderators.search(connection, {
      body: {
        granted_at_from: "not-a-date" as any,
      },
    }),
  );

  // 2. Test with negative page and limit (outside int32 valid range)
  await TestValidator.error("negative page/limit should return error")(() =>
    api.functional.discussionBoard.admin.moderators.search(connection, {
      body: {
        page: -1 as any,
        limit: -100 as any,
      },
    }),
  );

  // 3. Test logical error: revoked_at_from is after revoked_at_to
  const early = "2025-10-10T00:00:00.000Z";
  const late = "2020-01-01T00:00:00.000Z";
  await TestValidator.error("revoked_at_from after revoked_at_to should fail")(
    () =>
      api.functional.discussionBoard.admin.moderators.search(connection, {
        body: {
          revoked_at_from: early,
          revoked_at_to: late,
        },
      }),
  );
}
