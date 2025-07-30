import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced moderator search filtering by user_identifier substring and
 * pagination.
 *
 * This test ensures the moderator admin search (PATCH
 * /discussionBoard/admin/moderators) correctly applies user_identifier
 * substring filtering and paginates results as expected. Both active and
 * revoked moderators must appear in results depending on filter/query.
 *
 * 1. Insert multiple moderator records with varying user_identifiers, including
 *    some unique substrings for filtering (via POST).
 * 2. Query with PATCH specifying a user_identifier substring that should match
 *    only some inserted records.
 * 3. Verify that all returned records contain the substring in their
 *    user_identifier field, and that no records outside this group are
 *    included.
 * 4. Insert enough records to require multiple pages. Use PATCH with LIMIT and
 *    PAGE fields to request page 2 of results for the substring filter.
 * 5. Confirm that pagination metadata matches expectation, and data in the second
 *    page also all matches the substring filter. Results are not duplicated
 *    across pages.
 * 6. Repeat search for a revoked moderator by filtering for their full
 *    user_identifier or revoked_at window; verify only explicitly revoked
 *    moderators are returned.
 */
export async function test_api_discussionBoard_admin_moderators_test_advanced_search_moderators_by_user_identifier(
  connection: api.IConnection,
) {
  // 1. Insert 6 moderators: 4 active, 2 revoked. Some share a common substring 'testmod',
  // others have unrelated identifiers. Make 3 with 'testmod', 1 with a different active id, 2 revoked (1 with 'testmod').
  const moderators: IDiscussionBoardModerator[] = [];
  const now = new Date();
  for (let i = 0; i < 6; ++i) {
    const isRevoked = i >= 4; // Last two revoked
    const baseUser = i < 3 ? `testmod${i}` : `othermod${i}`;
    const grantedAt = new Date(now.getTime() - i * 86400000).toISOString();
    const revokedAt = isRevoked
      ? new Date(now.getTime() - i * 42700000).toISOString()
      : null;
    const moderator =
      await api.functional.discussionBoard.admin.moderators.create(connection, {
        body: {
          user_identifier: baseUser + "@domain.com",
          granted_at: grantedAt,
          revoked_at: revokedAt,
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    typia.assert(moderator);
    moderators.push(moderator);
  }
  // 2. Search by user_identifier substring ("testmod") with no pagination (all on 1 page)
  {
    const searchResult =
      await api.functional.discussionBoard.admin.moderators.search(connection, {
        body: {
          user_identifier: "testmod",
        } satisfies IDiscussionBoardModerator.IRequest,
      });
    typia.assert(searchResult);
    // Check all returned have 'testmod' and no others
    for (const m of searchResult.data) {
      TestValidator.predicate("user_identifier substring")(
        m.user_identifier.includes("testmod"),
      );
    }
    TestValidator.equals("found moderators")(searchResult.data.length)(3);
  }
  // 3. Pagination: search with limit 2, page 1, should get first two testmod moderators
  {
    const pg1 = await api.functional.discussionBoard.admin.moderators.search(
      connection,
      {
        body: {
          user_identifier: "testmod",
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
    typia.assert(pg1);
    TestValidator.equals("pagination page 1")(pg1.pagination.current)(1);
    TestValidator.equals("pagination limit")(pg1.pagination.limit)(2);
    TestValidator.equals("pagination records")(pg1.pagination.records)(3);
    TestValidator.equals("pagination pages")(pg1.pagination.pages)(2);
    // Data length
    TestValidator.equals("page 1 data length")(pg1.data.length)(2);
    // All have substring
    for (const m of pg1.data) {
      TestValidator.predicate("page 1 subset testmod")(
        m.user_identifier.includes("testmod"),
      );
    }
    // Next page (page 2) should contain last matching moderator
    const pg2 = await api.functional.discussionBoard.admin.moderators.search(
      connection,
      {
        body: {
          user_identifier: "testmod",
          limit: 2,
          page: 2,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
    typia.assert(pg2);
    TestValidator.equals("pagination page 2")(pg2.pagination.current)(2);
    TestValidator.equals("page 2 data length")(pg2.data.length)(1);
    for (const m of pg2.data) {
      TestValidator.predicate("page 2 subset testmod")(
        m.user_identifier.includes("testmod"),
      );
    }
    // Check no overlap between page 1 and page 2
    const idsPg1 = pg1.data.map((m) => m.id);
    const idsPg2 = pg2.data.map((m) => m.id);
    for (const id of idsPg2) {
      TestValidator.predicate("no duplicate across pages")(
        !idsPg1.includes(id),
      );
    }
  }
  // 4. Search for revoked moderator using revoked_at window and user_identifier
  {
    // Pick the first revoked moderator
    const revoked = moderators.find(
      (m) => !!m.revoked_at && m.user_identifier.startsWith("testmod"),
    )!;
    // Use full user_identifier
    const searchById =
      await api.functional.discussionBoard.admin.moderators.search(connection, {
        body: {
          user_identifier: revoked.user_identifier,
        } satisfies IDiscussionBoardModerator.IRequest,
      });
    typia.assert(searchById);
    // Should find exactly one and have revoked_at present
    TestValidator.equals("revoked search by id count")(searchById.data.length)(
      1,
    );
    TestValidator.predicate("revoked_at non-null")(
      !!searchById.data[0].revoked_at,
    );
    TestValidator.equals("exact match")(searchById.data[0].user_identifier)(
      revoked.user_identifier,
    );
    // Use revoked_at_from/revoked_at_to with a window covering the revoked_at date
    const searchByTime =
      await api.functional.discussionBoard.admin.moderators.search(connection, {
        body: {
          revoked_at_from: new Date(
            new Date(revoked.revoked_at!).getTime() - 1000,
          ).toISOString(),
          revoked_at_to: new Date(
            new Date(revoked.revoked_at!).getTime() + 5000,
          ).toISOString(),
        },
      });
    typia.assert(searchByTime);
    // At least this moderator appears in results, and its revoked_at in window
    TestValidator.predicate("revoked moderator returned")(
      searchByTime.data.some((m) => m.id === revoked.id && !!m.revoked_at),
    );
  }
}
