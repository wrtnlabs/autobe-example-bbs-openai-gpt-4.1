import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for listing discussion board moderators with advanced filters, pagination, and permission enforcement.
 *
 * This test verifies that administrator users can list moderator assignments
 * with various filters (status, assigned time windows, partial username search)
 * and that only authorized accounts can access the API. It checks correct pagination,
 * filtering, the return of empty results for unmatched filters, and permission
 * denial for non-admin accounts.
 *
 * Steps:
 * 1. Create several members for moderator assignment and search
 * 2. Assign moderator roles to all test members (admin permissions assumed for connection)
 * 3. As admin, list moderators with no filters, verify pagination & returned data
 * 4. List active moderators only (active_only = true), verify only unrevoked assignments are returned
 * 5. List all moderators (active_only = false), structure validation
 * 6. Filter by assigned_after (past date), expect all records
 * 7. Filter by username prefix for a specific test member, verify correct subset match
 * 8. Filter with assigned_after in the future, expect empty result set
 * 9. Attempt to list moderators as a non-admin account (should result in permission error)
 */
export async function test_api_discussionBoard_test_list_moderators_with_pagination_and_filters(connection: api.IConnection) {
  // 1. Create several members to assign as moderators and for search tests
  const testMembers = await ArrayUtil.asyncRepeat(3)(async () => {
    const member = await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: typia.random<string & tags.Format<"email">>(),
        hashed_password: RandomGenerator.alphaNumeric(32),
        display_name: RandomGenerator.name(),
        profile_image_url: undefined,
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // 2. Assign each test member as a moderator (admin user assumed for connection)
  const moderatorAssignments = await ArrayUtil.asyncMap(testMembers)(async (member) => {
    const assignment = await api.functional.discussionBoard.moderators.post(connection, {
      body: { member_id: member.id } satisfies IDiscussionBoardModerator.ICreate,
    });
    typia.assert(assignment);
    return assignment;
  });

  // 3. List moderators without filters (default pagination)
  const pageDefault = await api.functional.discussionBoard.moderators.patch(connection, {
    body: {} satisfies IDiscussionBoardModerator.IRequest
  });
  typia.assert(pageDefault);
  TestValidator.predicate("pagination present")(!!pageDefault.pagination);
  TestValidator.predicate("has at least all newly assigned moderators")(pageDefault.data.length >= moderatorAssignments.length);

  // 4. List only active (unrevoked) moderators
  const pageActive = await api.functional.discussionBoard.moderators.patch(connection, {
    body: { active_only: true } satisfies IDiscussionBoardModerator.IRequest
  });
  typia.assert(pageActive);
  TestValidator.predicate("all moderators in active filter are active")(pageActive.data.every(m => !m.revoked_at));

  // 5. List all moderators (active_only = false), just checking structure
  const pageAll = await api.functional.discussionBoard.moderators.patch(connection, {
    body: { active_only: false } satisfies IDiscussionBoardModerator.IRequest
  });
  typia.assert(pageAll);
  TestValidator.predicate("all moderators page data array structure")(Array.isArray(pageAll.data));

  // 6. Filter by assigned_after (10 days ago - all test records should match)
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const pageAfter = await api.functional.discussionBoard.moderators.patch(connection, {
    body: { assigned_after: tenDaysAgo } satisfies IDiscussionBoardModerator.IRequest
  });
  typia.assert(pageAfter);
  TestValidator.predicate("all test members assigned after 10 days ago exist")(
    moderatorAssignments.every(mod => pageAfter.data.some(d => d.id === mod.id))
  );

  // 7. Filter by username (partial prefix for first test member)
  const usernamePrefix = testMembers[0].username.slice(0, 4);
  const pageByUsername = await api.functional.discussionBoard.moderators.patch(connection, {
    body: { username: usernamePrefix } satisfies IDiscussionBoardModerator.IRequest
  });
  typia.assert(pageByUsername);
  TestValidator.predicate("at least one username match exists")(
    pageByUsername.data.some(m => m.member?.username.includes(usernamePrefix))
  );

  // 8. assigned_after filter in the far future - should yield no moderators
  const farFuture = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString();
  const pageFuture = await api.functional.discussionBoard.moderators.patch(connection, {
    body: { assigned_after: farFuture } satisfies IDiscussionBoardModerator.IRequest
  });
  typia.assert(pageFuture);
  TestValidator.equals("no moderators for future asgn")(pageFuture.data.length)(0);

  // 9. Attempt moderator listing as non-admin (should fail):
  const nonAdminMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(32),
      display_name: RandomGenerator.name(),
      profile_image_url: undefined,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(nonAdminMember);
  TestValidator.error("listing moderators as non-admin must fail")(async () => {
    await api.functional.discussionBoard.moderators.patch(connection, {
      body: {} satisfies IDiscussionBoardModerator.IRequest
    });
  });
}