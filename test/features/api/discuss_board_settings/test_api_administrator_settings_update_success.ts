import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussBoardSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardSettings";

/**
 * Validate success of updating a discussBoard global settings record.
 *
 * An administrator account is registered via join, setting authentication
 * context. The available settings records are fetched (index/search) and a
 * valid settings UUID is selected. The administrator then performs an
 * update operation on the selected settings with a new config_json payload
 * (as a full JSON string update). The response is asserted to match the new
 * configuration and the correct settings record is targeted. All
 * authentication and type safety workflows are included and validated.
 */
export async function test_api_administrator_settings_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IDiscussBoardAdministrator.IJoin;
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Retrieve available discussBoard global settings to get a settings UUID
  const settingsIndexBody = {} satisfies IDiscussBoardSettings.IRequest;
  const settingsPage =
    await api.functional.discussBoard.administrator.settings.index(connection, {
      body: settingsIndexBody,
    });
  typia.assert(settingsPage);
  TestValidator.predicate(
    "at least one settings record exists",
    settingsPage.data.length > 0,
  );
  const settings = settingsPage.data[0];
  typia.assert(settings);

  // 3. Prepare new config_json (as a JSON string representing new settings)
  const newConfig = {
    maintenance: false,
    features: [RandomGenerator.name(), RandomGenerator.name()],
  };
  const updateBody = {
    config_json: JSON.stringify(newConfig),
  } satisfies IDiscussBoardSettings.IUpdate;

  // 4. Administrator updates the chosen settings record
  const updatedSettings =
    await api.functional.discussBoard.administrator.settings.update(
      connection,
      {
        id: settings.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSettings);
  TestValidator.equals(
    "settings config_json should match the updated JSON",
    updatedSettings.config_json,
    updateBody.config_json,
  );
  TestValidator.equals(
    "settings id should not change after update",
    updatedSettings.id,
    settings.id,
  );
}

/**
 * The draft code closely follows business and technical requirements: it starts
 * by joining a new administrator, asserts the authentication, fetches existing
 * settings via index, picks a record, builds a valid config_json, performs the
 * update, then validates that settings id and config_json match the intended
 * outcome. All usage of DTO variants is exactly correct. TestValidator is used
 * with required title and proper order. API calls are all awaited and
 * parameters are named and structured per the SDK definition. Request body and
 * assertions use satisfies for DTO interface, and there is no extraneous type
 * assertion, no direct type annotation, and no missing required property. There
 * are no type error validation attempts, and all error scenarios omitted (per
 * requirements). No imports/manipulation of headers are performed. No logic or
 * structure violation is present. The code is clean, idiomatic, and aligned
 * with mandatory checklist, including template and description placement.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
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
 *   - O All TestValidator functions include descriptive title as first parameter
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
 *   - O NEVER touch connection.headers in any way - ZERO manipulation allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns
 *   - O Random data generation uses appropriate constraints and formats
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
 *   - O No fictional functions or types from examples are used
 *   - O No type safety violations (`any`, `@ts-ignore`, `@ts-expect-error`)
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
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
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
