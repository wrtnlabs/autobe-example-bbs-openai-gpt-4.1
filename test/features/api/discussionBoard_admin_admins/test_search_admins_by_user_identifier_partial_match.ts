import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate the search functionality for admin users by partial match on
 * user_identifier (e.g., email, SSO ID).
 *
 * This test covers backend admin panel scenarios such as quick lookup, audits,
 * and record verification by fragments of user_identifier.
 *
 * 1. Create several admin records with overlapping user_identifier fragments
 *    (e.g., 'alice.admin01@company.com', 'alice.admin02@company.com',
 *    'alice.auditor@company.com', 'bob.admin@company.com').
 * 2. Perform a PATCH search using a partial string (e.g., 'alice.') as
 *    user_identifier.
 * 3. Confirm that all admins whose user_identifier includes the search fragment
 *    are returned, and only those.
 * 4. Test that pagination works (limit, page), and ordering matches input order if
 *    relevant.
 * 5. Verify that searching with a non-matching fragment returns an empty result
 *    set.
 */
export async function test_api_discussionBoard_admin_admins_test_search_admins_by_user_identifier_partial_match(
  connection: api.IConnection,
) {
  // 1. Create several admin records with known-overlap identifiers
  const now = new Date().toISOString();
  const adminInputs = [
    { user_identifier: "alice.admin01@company.com", granted_at: now },
    { user_identifier: "alice.admin02@company.com", granted_at: now },
    { user_identifier: "alice.auditor@company.com", granted_at: now },
    { user_identifier: "bob.admin@company.com", granted_at: now },
  ];
  const createdAdmins = [];
  for (const input of adminInputs) {
    const admin = await api.functional.discussionBoard.admin.admins.create(
      connection,
      {
        body: {
          ...input,
          revoked_at: null,
        } satisfies IDiscussionBoardAdmin.ICreate,
      },
    );
    typia.assert(admin);
    createdAdmins.push(admin);
  }

  // 2. Search for user_identifier containing 'alice.'
  const searchFragment = "alice.";
  const searchResult = await api.functional.discussionBoard.admin.admins.search(
    connection,
    {
      body: {
        user_identifier: searchFragment,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(searchResult);
  // Filter local source for matching expectations
  const expected = createdAdmins.filter((a) =>
    a.user_identifier.includes(searchFragment),
  );
  // Match found records (ids) exactly
  const returnedIds = searchResult.data.map((r) => r.id).sort();
  const expectedIds = expected.map((a) => a.id).sort();
  TestValidator.equals("matched ids")(returnedIds)(expectedIds);

  // 3. Test pagination: limit = 2
  const pagedResult = await api.functional.discussionBoard.admin.admins.search(
    connection,
    {
      body: {
        user_identifier: searchFragment,
        limit: 2,
        page: 1,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(pagedResult);
  TestValidator.equals("pagination limit")(pagedResult.data.length)(2);
  TestValidator.equals("pagination total")(pagedResult.pagination.records)(
    expected.length,
  );

  // 4. Searching with a fragment that matches none
  const noMatchResult =
    await api.functional.discussionBoard.admin.admins.search(connection, {
      body: {
        user_identifier: "zzz.notfound",
      } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(noMatchResult);
  TestValidator.equals("empty match set")(noMatchResult.data.length)(0);
}
