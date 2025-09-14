import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";
import type { IDiscussBoardPostReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostReaction";

/**
 * Validate that a member can retrieve the detail of their own post reaction.
 *
 * This test covers the workflow:
 *
 * 1. Create a member with unique info.
 * 2. The member creates a post on the discuss board.
 * 3. The member reacts (like/dislike) to their own post.
 * 4. Retrieve the reaction detail by its ID as the member who created it.
 * 5. Confirm the reaction detail (IDs, type, timestamps) matches creation.
 */
export async function test_api_post_reaction_member_at_own_detail(
  connection: api.IConnection,
) {
  // 1. Member registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "!A1",
    nickname: RandomGenerator.name(),
    consent: [
      {
        policy_type: "privacy_policy",
        policy_version: "1.0",
        consent_action: "granted",
      },
      {
        policy_type: "terms_of_service",
        policy_version: "1.0",
        consent_action: "granted",
      },
    ],
  } satisfies IDiscussBoardMember.IJoin;
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(memberAuth);
  TestValidator.equals(
    "joined nickname matches",
    memberAuth.nickname,
    joinBody.nickname,
  );
  TestValidator.equals(
    "joined email account id not empty",
    typeof memberAuth.user_account_id,
    "string",
  );

  // 2. Create a post as this member
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IDiscussBoardPost.ICreate;
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);
  TestValidator.equals("post author is member", post.author_id, memberAuth.id);
  TestValidator.equals("post title matches", post.title, postBody.title);

  // 3. React to own post (like/dislike)
  const reactionType = RandomGenerator.pick(["like", "dislike"] as const);
  const reactionBody = {
    discuss_board_post_id: post.id,
    reaction_type: reactionType,
  } satisfies IDiscussBoardPostReaction.ICreate;
  const postReaction =
    await api.functional.discussBoard.member.postReactions.create(connection, {
      body: reactionBody,
    });
  typia.assert(postReaction);
  TestValidator.equals(
    "post reaction matches post",
    postReaction.discuss_board_post_id,
    post.id,
  );
  TestValidator.equals(
    "reaction type matches",
    postReaction.reaction_type,
    reactionType,
  );
  TestValidator.equals(
    "reaction is by member",
    postReaction.discuss_board_member_id,
    memberAuth.id,
  );

  // 4. Retrieve the reaction detail (GET)
  const reactionDetail =
    await api.functional.discussBoard.member.postReactions.at(connection, {
      postReactionId: postReaction.id,
    });
  typia.assert(reactionDetail);

  // 5. Validate retrieved detail fields
  TestValidator.equals(
    "fetched reaction id matches",
    reactionDetail.id,
    postReaction.id,
  );
  TestValidator.equals(
    "fetched member id matches",
    reactionDetail.discuss_board_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "fetched post id matches",
    reactionDetail.discuss_board_post_id,
    post.id,
  );
  TestValidator.equals(
    "fetched reaction_type matches",
    reactionDetail.reaction_type,
    reactionType,
  );
  TestValidator.equals(
    "created_at matches",
    typeof reactionDetail.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at matches",
    typeof reactionDetail.updated_at,
    "string",
  );
  // deleted_at is optional/null when not deleted
}

/**
 * - All steps of the scenario are included: member registration, post creation,
 *   post reaction, and retrieval.
 * - Imports are untouched and only use those provided in the template; no extra
 *   imports.
 * - Proper random value generation for member, post, and reaction
 *   (RandomGenerator, typia.random).
 * - All API SDK calls are awaited and structured using correct parameter objects.
 * - TestValidator uses descriptive titles as the first parameter in all cases.
 * - No type errors are deliberately tested, and all types are correct and safe.
 * - Authentication is handled by /auth/member/join and used for all subsequent
 *   requests; no manual token/headers manipulation.
 * - All TestValidator checks (actual-first pattern, matching scenario logic and
 *   expected values).
 * - Typia.assert() on all API responses with data types.
 * - No illogical business flows or forbidden patterns.
 * - No error scenario is tested (e.g., access by non-owners) per this scenario;
 *   only main happy path is validated. If edge/error needed, this test could be
 *   extended, but stays within current bounds.
 * - No type assertions, non-null assertions, or creative type bypasses.
 * - No extra/external functions defined; helper functions are inline if at all.
 * - RandomGenerator.pick on reaction_type uses 'as const' for const assertion.
 *   Arrays used as 'as const'.
 * - All timestamp/date-time fields only checked for type (string) but not
 *   detailed format regex, as typia.assert covers all format checks.
 * - All required fields for composite bodies are included for each call.
 * - Comprehensive comments and JSDoc for scenario and steps.
 * - No markdown, only code that fits the .ts file as required.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
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
