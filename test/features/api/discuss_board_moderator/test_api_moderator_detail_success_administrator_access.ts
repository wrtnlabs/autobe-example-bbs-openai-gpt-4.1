import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMembers";
import type { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";

/**
 * Validate administrator access to specific moderator detail.
 *
 * 1. Register an administrator and ensure authentication.
 * 2. Create a member (requires admin privileges).
 * 3. Assign moderator rights to the member using the admin.
 * 4. Retrieve moderator details as administrator.
 * 5. Assert GET details match setup.
 */
export async function test_api_moderator_detail_success_administrator_access(
  connection: api.IConnection,
) {
  // 1. Register an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinRes = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        nickname: RandomGenerator.name(),
      } satisfies IDiscussBoardAdministrator.IJoin,
    },
  );
  typia.assert(adminJoinRes);
  const adminId = adminJoinRes.id;

  // Ensure further requests use administrator authentication by default.

  // 2. Create a member (as admin)
  const member = await api.functional.discussBoard.administrator.members.create(
    connection,
    {
      body: {
        user_account_id: typia.random<string & tags.Format<"uuid">>(),
        nickname: RandomGenerator.name(),
        status: "active",
      } satisfies IDiscussBoardMembers.ICreate,
    },
  );
  typia.assert(member);
  const memberId = member.id;

  // 3. Assign moderator rights to the member (as admin)
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      member_id: memberId,
      assigned_by_administrator_id: adminId,
    } satisfies IDiscussBoardModerator.ICreate,
  });
  typia.assert(moderatorAuth);
  const moderatorId = moderatorAuth.id;

  // 4. Retrieve moderator details (as admin)
  const moderatorDetail =
    await api.functional.discussBoard.administrator.moderators.at(connection, {
      moderatorId,
    });
  typia.assert(moderatorDetail);

  // 5. Assert that detail matches initial assignment
  TestValidator.equals("moderator id matches", moderatorDetail.id, moderatorId);
  TestValidator.equals(
    "moderator's member_id matches member",
    moderatorDetail.member_id,
    memberId,
  );
  TestValidator.equals(
    "assigned_by_administrator_id matches admin",
    moderatorDetail.assigned_by_administrator_id,
    adminId,
  );
  TestValidator.equals(
    "moderator status is active",
    moderatorDetail.status,
    "active",
  );
}

/**
 * The draft code correctly follows the implementation plan, maintaining type
 * safety, proper authentication, and using only API functions and DTOs
 * provided. All TestValidator functions include descriptive titles. All request
 * bodies are constructed using satisfies pattern without type annotations. No
 * extraneous imports were added, and all logic adheres to the template
 * boundaries and input DTO schemas. Every API call uses await and typia.assert
 * is called on outputs. All assignments, authentication, and references use
 * correct types/fields per DTO. No role mixing or type violations were present.
 * Edge cases and error handling are omitted as required. No prohibited patterns
 * detected. All checklist points are satisfied.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Code Quality
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O All DTO property names match definitions
 *   - O Request body uses satisfies, no type annotation
 *   - O No type safety bypasses (as any, @ts-*)
 *   - O No role mixing without context switching
 *   - O TestValidator title parameter present in all assertions
 *   - O All edge cases omitted per scenario focus
 *   - O No manual header/token management
 *   - O All typia.random usages use generics properly
 */
const __revise = {};
__revise;
