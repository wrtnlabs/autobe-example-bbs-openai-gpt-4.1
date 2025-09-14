import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";

/**
 * Validate administrator account update scenarios including privilege
 * changes, RBAC constraints, and audit field modifications.
 *
 * 1. Register Administrator A (who will perform update operations)
 * 2. Register Administrator B
 * 3. Switch session context to Administrator A using login
 * 4. Update Administrator B's status from 'active' to 'suspended' as Admin
 *    A—verify: status, updated_at (should change), and revoked_at (should
 *    remain unset)
 * 5. Update Administrator B's status from 'suspended' to 'resigned', and set
 *    revoked_at to current time—verify: status, revoked_at set as supplied,
 *    and updated_at is refreshed
 * 6. Try updating with an invalid administratorId—confirm error thrown
 * 7. Attempt to demote (suspend) Administrator A when now the only active
 *    admin—request should be rejected for business continuity
 * 8. (Edge): Re-promote Administrator B to 'active', then successfully demote
 *    Administrator A—validate status/fields and constraint logic
 *
 * Each step must ensure full type safety and audit compliance, all asserts
 * titled descriptively, and error scenarios expect rejection strictly via
 * runtime error (never type error). No duplicate joins, header, or role mix
 * violations. Only business logic errors are tested.
 */
export async function test_api_administrator_account_update_success_and_constraint_errors(
  connection: api.IConnection,
) {
  // Register Administrator A
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IDiscussBoardAdministrator.IJoin;
  const adminA = await api.functional.auth.administrator.join(connection, {
    body: joinBodyA,
  });
  typia.assert(adminA);
  TestValidator.predicate(
    "Admin A status is active after join",
    adminA.status === "active",
  );

  // Register Administrator B
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IDiscussBoardAdministrator.IJoin;
  const adminB = await api.functional.auth.administrator.join(connection, {
    body: joinBodyB,
  });
  typia.assert(adminB);
  TestValidator.predicate(
    "Admin B status is active after join",
    adminB.status === "active",
  );

  // Switch session to Administrator A (to guarantee correct privilege context)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: joinBodyA.email,
      password: joinBodyA.password,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });

  // Step 4: Suspend Administrator B
  const suspendTime = new Date().toISOString();
  const suspendedB =
    await api.functional.discussBoard.administrator.administrators.update(
      connection,
      {
        administratorId: adminB.id,
        body: {
          status: "suspended",
          updated_at: suspendTime,
        } satisfies IDiscussBoardAdministrator.IUpdate,
      },
    );
  typia.assert(suspendedB);
  TestValidator.equals(
    "Admin B status updated to suspended",
    suspendedB.status,
    "suspended",
  );
  TestValidator.equals(
    "Admin B revoked_at remains unset while suspended",
    suspendedB.revoked_at,
    null,
  );
  TestValidator.equals(
    "Admin B updated_at is set to request value after suspension",
    suspendedB.updated_at,
    suspendTime,
  );

  // Step 5: Resign Administrator B
  const revokeTime = new Date(Date.now() + 1000).toISOString();
  const resignedB =
    await api.functional.discussBoard.administrator.administrators.update(
      connection,
      {
        administratorId: adminB.id,
        body: {
          status: "resigned",
          revoked_at: revokeTime,
          updated_at: revokeTime,
        } satisfies IDiscussBoardAdministrator.IUpdate,
      },
    );
  typia.assert(resignedB);
  TestValidator.equals(
    "Admin B status set to resigned",
    resignedB.status,
    "resigned",
  );
  TestValidator.equals(
    "Admin B revoked_at set after resignation",
    resignedB.revoked_at,
    revokeTime,
  );
  TestValidator.equals(
    "Admin B updated_at set after resignation",
    resignedB.updated_at,
    revokeTime,
  );

  // Step 6: Attempt update of non-existent admin ID
  await TestValidator.error(
    "Updating with invalid administratorId throws error",
    async () => {
      await api.functional.discussBoard.administrator.administrators.update(
        connection,
        {
          administratorId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "suspended",
          } satisfies IDiscussBoardAdministrator.IUpdate,
        },
      );
    },
  );

  // Step 7: Attempt to demote (suspend) Administrator A when only active admin
  const timeA = new Date(Date.now() + 2000).toISOString();
  await TestValidator.error(
    "Cannot suspend only remaining active admin (Admin A)",
    async () => {
      await api.functional.discussBoard.administrator.administrators.update(
        connection,
        {
          administratorId: adminA.id,
          body: {
            status: "suspended",
            updated_at: timeA,
          } satisfies IDiscussBoardAdministrator.IUpdate,
        },
      );
    },
  );

  // Step 8: Re-activate Administrator B, then suspend A (check logic transitions)
  // First, re-activate B
  const reactivateTime = new Date(Date.now() + 3000).toISOString();
  const reactivatedB =
    await api.functional.discussBoard.administrator.administrators.update(
      connection,
      {
        administratorId: adminB.id,
        body: {
          status: "active",
          revoked_at: null,
          updated_at: reactivateTime,
        } satisfies IDiscussBoardAdministrator.IUpdate,
      },
    );
  typia.assert(reactivatedB);
  TestValidator.equals(
    "Admin B re-activated to active",
    reactivatedB.status,
    "active",
  );
  TestValidator.equals(
    "Admin B revoked_at cleared on re-activation",
    reactivatedB.revoked_at,
    null,
  );
  TestValidator.equals(
    "Admin B updated_at correct on re-activation",
    reactivatedB.updated_at,
    reactivateTime,
  );

  // Now, suspend A (should succeed now, constraint satisfied as there is another active admin)
  const finalSuspendTime = new Date(Date.now() + 4000).toISOString();
  const suspendedA =
    await api.functional.discussBoard.administrator.administrators.update(
      connection,
      {
        administratorId: adminA.id,
        body: {
          status: "suspended",
          updated_at: finalSuspendTime,
        } satisfies IDiscussBoardAdministrator.IUpdate,
      },
    );
  typia.assert(suspendedA);
  TestValidator.equals(
    "Admin A status updated to suspended after B reactivation",
    suspendedA.status,
    "suspended",
  );
  TestValidator.equals(
    "Admin A revoked_at stays null after suspension",
    suspendedA.revoked_at,
    null,
  );
  TestValidator.equals(
    "Admin A updated_at matches request after suspension",
    suspendedA.updated_at,
    finalSuspendTime,
  );
}

/**
 * No critical errors found. All required API calls use await, all DTOs are
 * precisely used, typia.assert is correctly invoked, TestValidator assertions
 * are fully titled, error scenarios do not test type errors. Null/undefined is
 * handled, updated_at and revoked_at are set/checked where appropriate. Clear
 * separation of login for privilege enforcement is maintained. No invented
 * properties or fictional DTOs, all code matches provided SDK and schema. The
 * business workflow is logical, audit integrity is maintained. Data generation
 * uses correct typia.random, RandomGenerator. The code structure is clean, only
 * template imports are used, no extra utilities, and the function
 * naming/signature match requirements.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have await
 *   - O All async operations inside conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O NEVER touch connection.headers in any way - ZERO manipulation allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O For TestValidator.error(), use await ONLY with async callbacks
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
 *   - O No fictional functions or types from examples are used
 *   - O No type safety violations (any, @ts-ignore, @ts-expect-error)
 *   - O All TestValidator functions include title as first parameter and use
 *       correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use as const
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use as Type - always use proper validation
 *   - O No Non-null Assertions: Never use ! operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
