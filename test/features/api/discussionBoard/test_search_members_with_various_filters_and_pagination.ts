import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Comprehensive E2E test for searching and paginating discussion board members.
 *
 * This test verifies:
 *  - Creation of multiple members with distinct attributes for filter cross-verification.
 *  - Filtering with all supported member properties (username, display_name, email, is_active, created_from/to).
 *  - Correct pagination (limit, page), with full edge case coverage (page out of range, limit boundaries, no results).
 *  - Privacy: only the allowed fields of IDiscussionBoardMember are ever included in results.
 *  - Robust error handling for invalid filters and pagination parameters.
 *  - As non-privileged user call is not implementable with current API set, this is documented in comments.
 */
export async function test_api_discussionBoard_test_search_members_with_various_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register varied member accounts
  const timestampNow = new Date();
  const membersData: IDiscussionBoardMember.ICreate[] = [
    {
      username: 'alice_'+RandomGenerator.alphaNumeric(4),
      email: `alice_${RandomGenerator.alphaNumeric(6)}@e2etest.local`,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: 'Alice Tester',
      profile_image_url: null,
    },
    {
      username: 'bob_'+RandomGenerator.alphaNumeric(4),
      email: `bob_${RandomGenerator.alphaNumeric(6)}@e2etest.local`,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: 'Bob Reviewer',
      profile_image_url: null,
    },
    {
      username: 'carol_'+RandomGenerator.alphaNumeric(4),
      email: `carol_${RandomGenerator.alphaNumeric(6)}@e2etest.local`,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: 'Carol Observer',
      profile_image_url: null,
    },
  ];

  const createdMembers = [] as IDiscussionBoardMember[];
  for (const datum of membersData) {
    const member = await api.functional.discussionBoard.members.post(connection, {
      body: datum,
    });
    typia.assert(member);
    createdMembers.push(member);
  }

  // 2. Filter by username (positive exact match)
  {
    const filter = { username: createdMembers[0].username } satisfies IDiscussionBoardMember.IRequest;
    const page = await api.functional.discussionBoard.members.patch(connection, { body: filter });
    typia.assert(page);
    TestValidator.equals("by username - single result")(page.data.length)(1);
    TestValidator.equals("by username - username matches")(page.data[0].username)(createdMembers[0].username);
  }
  // 3. Filter by display name (positive, partial matches two users)
  {
    const filter = { display_name: 'Bob' } satisfies IDiscussionBoardMember.IRequest;
    const page = await api.functional.discussionBoard.members.patch(connection, { body: filter });
    typia.assert(page);
    // Should include at least Bob Reviewer, possible substring matches
    TestValidator.predicate("by display_name - at least one partial match")(page.data.some(m => m.display_name.includes('Bob')));
  }
  // 4. Filter by email (positive exact)
  {
    const filter = { email: createdMembers[2].email } satisfies IDiscussionBoardMember.IRequest;
    const page = await api.functional.discussionBoard.members.patch(connection, { body: filter });
    typia.assert(page);
    TestValidator.equals("by email - single result")(page.data.length)(1);
    TestValidator.equals("by email - email matches")(page.data[0].email)(createdMembers[2].email);
  }
  // 5. Filter by is_active (test both true/false, default is true; for negative, no api to deactivate so expect at least all are is_active===true)
  {
    const filter = { is_active: true } satisfies IDiscussionBoardMember.IRequest;
    const page = await api.functional.discussionBoard.members.patch(connection, { body: filter });
    typia.assert(page);
    TestValidator.predicate("is_active filter all true")(page.data.every(m => m.is_active === true));
  }
  // 6. Filter by created_from/created_to (narrow window, at least one match)
  {
    // Use window including only now - 30s to now + 30s
    const from = new Date(Date.now() - 30000).toISOString();
    const to = new Date(Date.now() + 30000).toISOString();
    const filter = { created_from: from, created_to: to } satisfies IDiscussionBoardMember.IRequest;
    const page = await api.functional.discussionBoard.members.patch(connection, { body: filter });
    typia.assert(page);
    // All created members should be inside this range
    TestValidator.predicate("created window all within range")(page.data.every(m => m.created_at >= from && m.created_at <= to));
  }
  // 7. Pagination: limit=1, page=2
  {
    const filter = { limit: 1, page: 2 } satisfies IDiscussionBoardMember.IRequest;
    const page = await api.functional.discussionBoard.members.patch(connection, { body: filter });
    typia.assert(page);
    TestValidator.equals("paginated page 2 size")(page.data.length)(1);
    TestValidator.equals("page meta limit")(page.pagination.limit)(1);
    TestValidator.equals("page meta current")(page.pagination.current)(2);
  }
  // 8. Page out of range (very large page number, expect empty data)
  {
    const filter = { limit: 1, page: 9999 } satisfies IDiscussionBoardMember.IRequest;
    const page = await api.functional.discussionBoard.members.patch(connection, { body: filter });
    typia.assert(page);
    TestValidator.equals("empty results out-of-range")(page.data.length)(0);
  }
  // 9. Filter yields no results
  {
    const filter = { username: 'nonexistentusername_' + RandomGenerator.alphaNumeric(8) } satisfies IDiscussionBoardMember.IRequest;
    const page = await api.functional.discussionBoard.members.patch(connection, { body: filter });
    typia.assert(page);
    TestValidator.equals("empty results - filter")(page.data.length)(0);
  }
  // 10. All fields present in returned members are limited to those in DTO (no admin/internal fields)
  {
    const filter = { } satisfies IDiscussionBoardMember.IRequest;
    const page = await api.functional.discussionBoard.members.patch(connection, { body: filter });
    typia.assert(page);
    // Check every member result has only allowed keys
    for (const member of page.data) {
      const allowed = ["id", "username", "email", "display_name", "profile_image_url", "is_active", "created_at", "updated_at", "deleted_at"];
      TestValidator.equals("fields only DTO")(Object.keys(member).sort())(allowed.sort());
    }
  }
  // 11. Negative: invalid email
  await TestValidator.error("invalid email filter")(async () => {
    const filter = { email: "nonsense!notanemail" } satisfies IDiscussionBoardMember.IRequest;
    await api.functional.discussionBoard.members.patch(connection, { body: filter });
  });
  // 12. Negative: page < 1
  await TestValidator.error("negative page")(async () => {
    const filter = { page: 0 } satisfies IDiscussionBoardMember.IRequest;
    await api.functional.discussionBoard.members.patch(connection, { body: filter });
  });
  // 13. Negative: limit < 1
  await TestValidator.error("limit less than 1")(async () => {
    const filter = { limit: 0 } satisfies IDiscussionBoardMember.IRequest;
    await api.functional.discussionBoard.members.patch(connection, { body: filter });
  });
  // 14. Negative: limit > 100
  await TestValidator.error("limit over max")(async () => {
    const filter = { limit: 101 } satisfies IDiscussionBoardMember.IRequest;
    await api.functional.discussionBoard.members.patch(connection, { body: filter });
  });
  // 15. Negative: try as non-privileged user
  // NOTE: No authentication/user role downgrade API is provided. This negative test is documented here, but can't be implemented with current SDK.
}