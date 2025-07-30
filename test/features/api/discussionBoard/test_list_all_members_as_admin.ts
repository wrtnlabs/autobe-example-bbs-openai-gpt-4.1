import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validates that an admin can retrieve a full paginated listing of all
 * discussion board members.
 *
 * This test ensures:
 *
 * - The admin endpoint returns a list including all members registered in the
 *   system.
 * - The listing includes every member created during setup with all key details
 *   (id, user_identifier, joined_at, suspended_at).
 * - Each member’s data in the result is accurate and matches what was used at
 *   creation.
 *
 * Steps:
 *
 * 1. Create several members via the admin creation endpoint (using unique
 *    user_identifiers and joined_at times).
 * 2. Call the admin listing endpoint to retrieve all board members.
 * 3. Assert that each setup member appears in the paginated listing with correct
 *    properties.
 * 4. Validate that at least the number of created members is present, and that the
 *    list item’s fields (id, user_identifier, joined_at, suspended_at) reflect
 *    creation-time values.
 */
export async function test_api_discussionBoard_admin_members_index(
  connection: api.IConnection,
) {
  // Step 1: Create several new board members (as admin)
  const setupMembers: IDiscussionBoardMember[] = await ArrayUtil.asyncRepeat(3)(
    async () => {
      const user_identifier = RandomGenerator.alphaNumeric(10);
      const joined_at = new Date().toISOString();
      const member = await api.functional.discussionBoard.admin.members.create(
        connection,
        {
          body: {
            user_identifier,
            joined_at,
          } satisfies IDiscussionBoardMember.ICreate,
        },
      );
      typia.assert(member);
      return member;
    },
  );

  // Step 2: Retrieve all members as admin
  const output: IPageIDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.index(connection);
  typia.assert(output);

  // Step 3: Assert that all newly created members appear in the result list
  for (const setupMember of setupMembers) {
    const found = output.data.find((m) => m.id === setupMember.id);
    TestValidator.predicate(`Member id ${setupMember.id} found in results`)(
      !!found,
    );
    if (found) {
      TestValidator.equals("user_identifier matches")(found.user_identifier)(
        setupMember.user_identifier,
      );
      TestValidator.equals("joined_at matches")(found.joined_at)(
        setupMember.joined_at,
      );
      TestValidator.equals("suspended_at matches")(found.suspended_at ?? null)(
        setupMember.suspended_at ?? null,
      );
    }
  }

  // Step 4: Optionally check that listing size is at least as many as were created in this test
  TestValidator.predicate("At least all setup members are present")(
    output.data.length >= setupMembers.length,
  );
}
