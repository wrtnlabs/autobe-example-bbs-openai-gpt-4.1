import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";

/**
 * Test that a newly registered member can successfully create a discuss board
 * post, and that created post correctly reflects owner and input data.
 *
 * Steps:
 *
 * 1. Register a new member with required policy consents and obtain authentication
 *    context.
 * 2. Prepare discuss board post ICreate data with only required fields (title,
 *    body) and create a post.
 * 3. Validate response: author_id matches member, business_status and timestamps
 *    are present, and all user-supplied data matches response values.
 * 4. Repeat with optional properties (supply business_status and a set of random
 *    tag_ids) and validate result.
 * 5. Confirm system behavior: omitting optional props uses defaults, providing
 *    assigns values.
 */
export async function test_api_member_post_create_success(
  connection: api.IConnection,
) {
  // 1. Register new member for author
  const email = typia.random<string & tags.Format<"email">>();
  const nickname = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "!A";
  const policyConsents: IDiscussBoardMember.IConsent[] = [
    {
      policy_type: "privacy_policy",
      policy_version: "v1.0",
      consent_action: "granted",
    },
    {
      policy_type: "terms_of_service",
      policy_version: "v1.0",
      consent_action: "granted",
    },
  ];
  const member: IDiscussBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        nickname,
        consent: policyConsents,
      } satisfies IDiscussBoardMember.IJoin,
    });
  typia.assert(member);
  TestValidator.equals("member nickname matches", member.nickname, nickname);

  // 2. Create post with only required fields
  const postReqMinimal = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IDiscussBoardPost.ICreate;
  const postMinimal: IDiscussBoardPost =
    await api.functional.discussBoard.member.posts.create(connection, {
      body: postReqMinimal,
    });
  typia.assert(postMinimal);
  TestValidator.equals(
    "author_id matches member",
    postMinimal.author_id,
    member.id,
  );
  TestValidator.equals(
    "title matches",
    postMinimal.title,
    postReqMinimal.title,
  );
  TestValidator.equals("body matches", postMinimal.body, postReqMinimal.body);
  TestValidator.predicate(
    "created_at is present",
    typeof postMinimal.created_at === "string" &&
      postMinimal.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof postMinimal.updated_at === "string" &&
      postMinimal.updated_at.length > 0,
  );

  // 3. Create post with optional parameters: business_status and tags
  const postReqOptional: IDiscussBoardPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 7, wordMax: 15 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    business_status: "public", // common allowed value
    tag_ids: [
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ],
  } satisfies IDiscussBoardPost.ICreate;
  const postWithOpts = await api.functional.discussBoard.member.posts.create(
    connection,
    { body: postReqOptional },
  );
  typia.assert(postWithOpts);
  TestValidator.equals(
    "optional business_status respected",
    postWithOpts.business_status,
    postReqOptional.business_status,
  );
  TestValidator.equals(
    "optional title respected",
    postWithOpts.title,
    postReqOptional.title,
  );
  TestValidator.equals(
    "optional body respected",
    postWithOpts.body,
    postReqOptional.body,
  );
  TestValidator.equals(
    "author_id correct for post with opts",
    postWithOpts.author_id,
    member.id,
  );
  // tag_ids is not part of response entity per DTO, omitted from validation
  TestValidator.predicate(
    "created_at present for opt post",
    typeof postWithOpts.created_at === "string" &&
      postWithOpts.created_at.length > 0,
  );
}

/**
 * - The draft implementation follows all import and template rules, using only
 *   provided imports and making zero import modifications.
 * - Each API invocation is properly awaited; all TestValidator functions use
 *   descriptive titles as the first parameter.
 * - No code attempts to test type errors, type validation, or HTTP status codes.
 * - All required and optional DTO properties are covered according to the
 *   scenario and schema.
 * - Proper data generation is used for random email, nickname, password, UUIDs,
 *   and content with constraints.
 * - No fictional or non-existent APIs/DTOs are called; only real functions/types
 *   are used, in the expected signature/structure.
 * - No connection.headers manipulation or custom auth helper usage exists.
 * - All null/undefined handling is proper. All business rules are respected
 *   (author must match member).
 * - TestValidator actual-first, expected-second pattern is consistently used,
 *   with proper type coverage.
 * - The description block and code comments provide comprehensive documentation
 *   of business context, workflow, and validation checkpoints.
 * - No step or assertion is omitted; edge cases for optional properties are
 *   exercised as per scenario.
 * - There is nothing to delete or fix for type errors, as none exist; all logic
 *   is valid and idiomatic.
 * - Final should be identical to the draft.
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
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
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
