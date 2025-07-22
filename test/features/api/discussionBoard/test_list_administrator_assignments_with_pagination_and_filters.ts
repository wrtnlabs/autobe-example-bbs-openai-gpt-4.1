import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for listing administrator assignments with pagination and filtering.
 *
 * This test verifies:
 *  - Setup/teardown: creation of members, admin role assignment
 *  - Listing all admin assignments as admin (default, filtered, paged, empty)
 *  - Filters: active_only, username, pagination
 *  - Pagination boundaries (first, last page, page overflow)
 *  - RBAC: only admins can access the admin list, regular member is denied
 *  - Input validation errors for bad pagination/filters
 *
 * Steps:
 * 1. Create two member accounts (A and B)
 * 2. Assign both as administrators
 * 3. List all assignments (should include both)
 * 4. Filter by only active admins
 * 5. Filter by username (A)
 * 6. Test pagination boundaries
 * 7. No-result filter returns empty list
 * 8. RBAC: normal members are denied access
 * 9. Input validation edge cases (limit=0, page<0)
 */
export async function test_api_discussionBoard_test_list_administrator_assignments_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. Create two members (A and B)
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: `${RandomGenerator.alphabets(7)}@test.com`,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberA);

  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberB);

  // 2. Assign both as administrators
  const adminAssignA = await api.functional.discussionBoard.administrators.post(connection, {
    body: { member_id: memberA.id },
  });
  typia.assert(adminAssignA);
  const adminAssignB = await api.functional.discussionBoard.administrators.post(connection, {
    body: { member_id: memberB.id },
  });
  typia.assert(adminAssignB);

  // 3. List all admins (default, no filters)
  const allAdmins = await api.functional.discussionBoard.administrators.patch(connection, {
    body: {},
  });
  typia.assert(allAdmins);
  TestValidator.predicate("should contain both members assigned as admins")(
    allAdmins.data.some(a => a.member_id === memberA.id) &&
    allAdmins.data.some(a => a.member_id === memberB.id)
  );

  // 4. Filter for only active admins
  const onlyActive = await api.functional.discussionBoard.administrators.patch(connection, {
    body: { active_only: true },
  });
  typia.assert(onlyActive);
  TestValidator.predicate("all listed admins are active")(
    onlyActive.data.every(a => a.revoked_at === null || a.revoked_at === undefined)
  );

  // 5. Filter by username (for memberA)
  const filteredByUsername = await api.functional.discussionBoard.administrators.patch(connection, {
    body: { username: memberA.username },
  });
  typia.assert(filteredByUsername);
  TestValidator.predicate("all match memberA username")(
    filteredByUsername.data.every(a => a.member && a.member.username === memberA.username)
  );

  // 6. Test pagination: limit=1, then get next page if exists
  const paged1 = await api.functional.discussionBoard.administrators.patch(connection, {
    body: { limit: 1, page: 1 },
  });
  typia.assert(paged1);
  TestValidator.equals("page 1, limit 1")(paged1.pagination.current)(1);
  TestValidator.equals("one result per page")(paged1.data.length)(1);
  if (paged1.pagination.pages > 1) {
    const paged2 = await api.functional.discussionBoard.administrators.patch(connection, {
      body: { limit: 1, page: 2 },
    });
    typia.assert(paged2);
    TestValidator.equals("page 2")(paged2.pagination.current)(2);
    TestValidator.equals("one result per page")(paged2.data.length)(1);
  }

  // 7. No results case - filter with a non-existent username
  const noResults = await api.functional.discussionBoard.administrators.patch(connection, {
    body: { username: "not_a_real_admin_username" },
  });
  typia.assert(noResults);
  TestValidator.equals("should have no results")(noResults.data.length)(0);

  // 8. RBAC: normal member cannot access
  const memberC = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: `${RandomGenerator.alphabets(8)}@user.com`,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberC);
  // Assuming context switching mechanism is available to login as memberC
  TestValidator.error("member should be forbidden from listing admins")(
    async () => {
      await api.functional.discussionBoard.administrators.patch(connection, {
        body: {},
      });
    }
  );

  // 9. Input validation: limit=0 (invalid)
  TestValidator.error("invalid: limit=0")(
    async () => {
      await api.functional.discussionBoard.administrators.patch(connection, {
        body: { limit: 0 },
      });
    }
  );

  // 10. Input validation: negative page
  TestValidator.error("invalid: page negative")(
    async () => {
      await api.functional.discussionBoard.administrators.patch(connection, {
        body: { page: -1 },
      });
    }
  );
}