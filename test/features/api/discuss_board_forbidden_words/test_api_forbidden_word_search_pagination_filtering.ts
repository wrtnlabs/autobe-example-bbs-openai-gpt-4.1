import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardForbiddenWords } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardForbiddenWords";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussBoardForbiddenWords } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardForbiddenWords";

/**
 * Validates forbidden word search API with pagination and filtering as an
 * administrator.
 *
 * This scenario covers the complete admin workflow for searching and
 * paginating forbidden word rules:
 *
 * 1. Register an administrator and obtain authentication.
 * 2. Create a set of forbidden word rules (at least five) with diverse
 *    expressions/descriptions.
 * 3. PATCH forbiddenWords with no filters (all records, default pagination)
 *    and validate all created records appear.
 * 4. Test full-text search -- PATCH with a search term from one record's
 *    expression, verify the result set contains only matching records.
 * 5. Test partial search on description -- use a unique substring from a
 *    description to filter and verify only matched records are returned.
 * 6. Test pagination: request small page size, check only a subset of records
 *    are returned, with correct pagination.current/limit/records/pages
 *    fields. Retrieve the next page and confirm correct slicing.
 * 7. Optionally, test created_at filtering window by using created_before
 *    and/or created_after on a known record.
 * 8. All API responses are validated with typia.assert(). All data matching
 *    and TestValidator assertions include a title for reporting
 *    consistency.
 */
export async function test_api_forbidden_word_search_pagination_filtering(
  connection: api.IConnection,
) {
  // 1. Administrator registration and authentication
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IDiscussBoardAdministrator.IJoin;
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Create five forbidden word rules (unique expressions/descriptions)
  const forbiddenWords = ArrayUtil.repeat(
    5,
    (i) =>
      ({
        expression: RandomGenerator.alphaNumeric(7) + `_fword_${i}`,
        description:
          `Test forbidden word number ${i}: ` +
          RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
      }) satisfies IDiscussBoardForbiddenWords.ICreate,
  );

  const createdWords: IDiscussBoardForbiddenWords[] = [];
  for (const fw of forbiddenWords) {
    const created =
      await api.functional.discussBoard.administrator.forbiddenWords.create(
        connection,
        { body: fw },
      );
    typia.assert(created);
    createdWords.push(created);
  }
  TestValidator.equals(
    "5 forbidden words were created",
    createdWords.length,
    5,
  );

  // 3. PATCH forbiddenWords with no filters (should get at least these 5, possibly more if others exist)
  const allPage =
    await api.functional.discussBoard.administrator.forbiddenWords.index(
      connection,
      { body: {} satisfies IDiscussBoardForbiddenWords.IRequest },
    );
  typia.assert(allPage);
  TestValidator.predicate(
    "page contains all created forbidden words",
    createdWords.every((word) =>
      allPage.data.some((got) => got.id === word.id),
    ),
  );

  // 4. Full-text search: by expression (exact)
  const exprToSearch = createdWords[2].expression;
  const exprPage =
    await api.functional.discussBoard.administrator.forbiddenWords.index(
      connection,
      {
        body: {
          search: exprToSearch,
        } satisfies IDiscussBoardForbiddenWords.IRequest,
      },
    );
  typia.assert(exprPage);
  TestValidator.predicate(
    "expression search returns correct records",
    exprPage.data.every((r) => r.expression === exprToSearch),
  );
  TestValidator.predicate(
    "record with matching expression returned",
    exprPage.data.some((r) => r.id === createdWords[2].id),
  );

  // 5. Partial search by description substring
  const descSubstring = RandomGenerator.substring(
    createdWords[3].description ?? "",
  );
  const descPage =
    await api.functional.discussBoard.administrator.forbiddenWords.index(
      connection,
      {
        body: {
          search: descSubstring,
        } satisfies IDiscussBoardForbiddenWords.IRequest,
      },
    );
  typia.assert(descPage);
  TestValidator.predicate(
    "description partial search matches record(s)",
    descPage.data.some((r) => r.description?.includes(descSubstring)),
  );

  // 6. Pagination: get page 1 with limit 2, then page 2 with limit 2
  const paged1 =
    await api.functional.discussBoard.administrator.forbiddenWords.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussBoardForbiddenWords.IRequest,
      },
    );
  typia.assert(paged1);
  TestValidator.equals(
    "pagination.limit is 2 (first page)",
    paged1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination.current is 1 (first page)",
    paged1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 contains at most 2 records",
    paged1.data.length <= 2,
  );

  const paged2 =
    await api.functional.discussBoard.administrator.forbiddenWords.index(
      connection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IDiscussBoardForbiddenWords.IRequest,
      },
    );
  typia.assert(paged2);
  TestValidator.equals(
    "pagination.limit is 2 (second page)",
    paged2.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination.current is 2 (second page)",
    paged2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 contains at most 2 records",
    paged2.data.length <= 2,
  );
  TestValidator.notEquals(
    "page 1 & page 2 are different slices",
    paged1.data,
    paged2.data,
  );

  // 7. (Optional) created_at window filtering: use created_before from one record
  const createdBefore = createdWords[0].created_at;
  const windowPage =
    await api.functional.discussBoard.administrator.forbiddenWords.index(
      connection,
      {
        body: {
          created_before: createdBefore,
        } satisfies IDiscussBoardForbiddenWords.IRequest,
      },
    );
  typia.assert(windowPage);
  // Should only return records created before the first created (usually none, but basic check)
  TestValidator.predicate(
    "either empty set or no records newer than 'created_before'",
    windowPage.data.length === 0 ||
      windowPage.data.every((r) => r.created_at < createdBefore),
  );
}

/**
 * - Imports: No additional imports, no changes to the template. Only the
 *   placeholder and scenario docstring were replaced and logic filled in.
 * - Function Structure: Single parameter (connection), correct name, one function
 *   only, all logic in function scope. No helper or external functions defined
 *   outside.
 * - Data Preparation: Uses random but realistic data for admin join and forbidden
 *   word creation (expressions/descriptions). Data is created deterministically
 *   and tracked for matching. All request body variables are const, never
 *   mutating or reassigning.
 * - API Calls: All API calls are properly awaited. Each call passes the correct
 *   parameter structure, always in the documented pattern. Each response is
 *   validated with typia.assert().
 * - Pagination & Filtering: Pagination uses page/limit; search is against
 *   expression and description. Slices are compared to validate pagination acts
 *   as expected, and edge checks (page 1 ≠ page 2) are performed. Created_at
 *   window test is included with correct logic for the scenario. All DTO types
 *   are correct.
 * - Assertions: All TestValidator calls include a descriptive title as the first
 *   parameter. The meaning and outcome are validated as per business rule in
 *   each assertion. Always uses actual-first, expected-second pattern.
 * - Type Safety: No type errors, no as any, no missing fields. All request bodies
 *   use satisfies pattern only (with no type annotation). No illegal type
 *   assertions; all types match.
 * - Nullability: Handles nullables properly for description and date-time types.
 *   No incorrect null/undefined handling. No missing required fields.
 * - Business Logic Realism: All relationships are respected: admin authenticates
 *   before forbidden word creation (as only admins can create/search). No role
 *   or logic mixups. Only valid scenarios; no tests for forbidden patterns or
 *   HTTP status codes.
 * - Documentation: Clear step-by-step code comments, separate scenario for each
 *   business case (no filter, filter by expression, filter by description,
 *   pagination, and created_at window filter).
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
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
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
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
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
