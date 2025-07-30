import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate the retrieval of a discussion board member's full details as an
 * admin user.
 *
 * This test confirms that retrieving a member by memberId as an admin returns
 * the full member record with all expected fields, and that the lookup works
 * for a real, system-created member.
 *
 * Steps:
 *
 * 1. Create a new member using the admin endpoint and record the generated
 *    memberId.
 * 2. Retrieve the member details with the returned memberId using the admin
 *    endpoint.
 * 3. Validate that the returned data structure includes all documented fields (id,
 *    user_identifier, joined_at, suspended_at).
 * 4. Assert that the retrieved record matches the one that was created in step 1,
 *    including id and user_identifier.
 * 5. Confirm type correctness of all returned values.
 */
export async function test_api_discussionBoard_admin_members_test_get_member_details_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a new member
  const now = new Date().toISOString();
  const userIdentifier: string = "member-" + typia.random<string>();
  const created = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: now,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(created);

  // 2. Retrieve the member details by memberId
  const fetched = await api.functional.discussionBoard.admin.members.at(
    connection,
    {
      memberId: created.id,
    },
  );
  typia.assert(fetched);

  // 3. Validate all required fields are present and correct
  TestValidator.equals("id matches")(fetched.id)(created.id);
  TestValidator.equals("user_identifier matches")(fetched.user_identifier)(
    created.user_identifier,
  );
  TestValidator.equals("joined_at matches")(fetched.joined_at)(
    created.joined_at,
  );

  // 4. Ensure suspended_at is null or undefined for a new member
  TestValidator.predicate("suspended_at default")(
    fetched.suspended_at === null ||
      typeof fetched.suspended_at === "undefined",
  );
}
