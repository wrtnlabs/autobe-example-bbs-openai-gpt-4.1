import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test admin advanced search/filter and pagination for discussion board
 * members.
 *
 * This test ensures that an admin can:
 *
 * 1. Filter members by suspension status (suspended, active)
 * 2. Search by user_identifier field
 * 3. Apply pagination and verify correct paging mechanics
 *
 * Steps:
 *
 * 1. Create 8 members with distinct user_identifiers and varied join dates. (No
 *    direct API support for setting suspension, so test will only validate
 *    what's possible.)
 * 2. Search by user_identifier, verifying a unique match.
 * 3. Test pagination by requesting small page sizes and checking results and
 *    metadata consistency.
 *
 * Note: As no endpoint for directly suspending members exists in the input set,
 * suspension filter tests are omitted.
 */
export async function test_api_discussionBoard_test_search_members_by_status_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create 8 members with unique user_identifiers
  const identifiers: string[] = ArrayUtil.repeat(8)(() =>
    RandomGenerator.alphaNumeric(8),
  );
  // Simulate a range of join dates in the past 10 days
  const joinedAts: string[] = ArrayUtil.repeat(8)(() => {
    const offsetMs = Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000); // up to 10 days in ms
    return new Date(Date.now() - offsetMs).toISOString();
  });
  for (let i = 0; i < 8; ++i) {
    const member = await api.functional.discussionBoard.admin.members.create(
      connection,
      {
        body: {
          user_identifier: identifiers[i],
          joined_at: joinedAts[i],
        } satisfies IDiscussionBoardMember.ICreate,
      },
    );
    typia.assert(member);
  }

  // 2. Search by user_identifier (should match only 1 member)
  const matchIdentifier = identifiers[2];
  const byIdRes = await api.functional.discussionBoard.admin.members.search(
    connection,
    {
      body: {
        user_identifier: matchIdentifier,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(byIdRes);
  TestValidator.predicate("user_identifier unique match")(
    byIdRes.data.length === 1 &&
      byIdRes.data[0].user_identifier === matchIdentifier,
  );

  // 3. Pagination logic: page size 3 for >2 pages
  const pageSize = 3;
  // Page 1
  const page1 = await api.functional.discussionBoard.admin.members.search(
    connection,
    {
      body: {
        page: 1,
        limit: pageSize,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination page1 data count")(page1.data.length)(
    pageSize,
  );
  TestValidator.equals("pagination page1 meta")(page1.pagination.current)(1);
  // Page 2
  const page2 = await api.functional.discussionBoard.admin.members.search(
    connection,
    {
      body: {
        page: 2,
        limit: pageSize,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("pagination page2 data count")(page2.data.length)(
    pageSize,
  );
  TestValidator.equals("pagination page2 meta")(page2.pagination.current)(2);
  // Page 3 (may have < pageSize if 8 members)
  const page3 = await api.functional.discussionBoard.admin.members.search(
    connection,
    {
      body: {
        page: 3,
        limit: pageSize,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.predicate("pagination last page count")(
    page3.data.length <= pageSize && page3.pagination.current === 3,
  );
}
