import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardComment";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";

/**
 * Validate retrieval of a single comment's details under a discussBoard post
 * for various access roles and error cases.
 *
 * 1. Register a member (author) and log in
 * 2. Create a post as the author
 * 3. Add a comment as the author
 * 4. Retrieve the comment as the author; validate all fields match
 * 5. Register another member (non-author)
 * 6. Retrieve the comment as non-author; validate visibility and equality
 * 7. Retrieve the comment as guest (empty headers); validate visibility and
 *    equality
 * 8. Attempt to retrieve comment with random, non-existent commentId - expect
 *    error
 * 9. Attempt to retrieve comment on non-existent post - expect error
 */
export async function test_api_comment_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register author
  const authorEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const authorPassword = RandomGenerator.alphaNumeric(12) + "#A1";
  const authorNickname = RandomGenerator.name();
  const authorConsent: IDiscussBoardMember.IConsent[] = [
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
  const author = await api.functional.auth.member.join(connection, {
    body: {
      email: authorEmail,
      password: authorPassword,
      nickname: authorNickname,
      consent: authorConsent,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(author);

  // 2. Create a post as author
  const postCreate = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussBoardPost.ICreate;
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    {
      body: postCreate,
    },
  );
  typia.assert(post);

  // 3. Add a comment
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const commentCreate = {
    content: commentContent,
  } satisfies IDiscussBoardComment.ICreate;
  const comment =
    await api.functional.discussBoard.member.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(comment);

  // 4. Retrieve comment as author
  const fetchedComment = await api.functional.discussBoard.posts.comments.at(
    connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  typia.assert(fetchedComment);
  TestValidator.equals(
    "comment detail matches created (author)",
    fetchedComment,
    comment,
  );

  // 5. Register a different member (non-author)
  const otherEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const otherPassword = RandomGenerator.alphaNumeric(12) + "#A1";
  const otherNickname = RandomGenerator.name();
  const otherConsent: IDiscussBoardMember.IConsent[] = [
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
  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      email: otherEmail,
      password: otherPassword,
      nickname: otherNickname,
      consent: otherConsent,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(otherMember);

  // 6. Switch to other member (non-author)
  // The latest API call sets the session; now retrieve comment as other member
  const fetchedCommentOther =
    await api.functional.discussBoard.posts.comments.at(connection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(fetchedCommentOther);
  TestValidator.equals(
    "comment detail matches for non-author",
    fetchedCommentOther,
    comment,
  );

  // 7. Guest access (no authentication)
  const guestConn: api.IConnection = { ...connection, headers: {} };
  const fetchedCommentGuest =
    await api.functional.discussBoard.posts.comments.at(guestConn, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(fetchedCommentGuest);
  TestValidator.equals(
    "comment detail matches for guest",
    fetchedCommentGuest,
    comment,
  );

  // 8. Attempt to fetch non-existent comment
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent comment gives error",
    async () => {
      await api.functional.discussBoard.posts.comments.at(connection, {
        postId: post.id,
        commentId: randomUuid,
      });
    },
  );

  // 9. Attempt to fetch comment from non-existent post
  await TestValidator.error(
    "fetching comment from non-existent post gives error",
    async () => {
      await api.functional.discussBoard.posts.comments.at(connection, {
        postId: randomUuid,
        commentId: comment.id,
      });
    },
  );
}

/**
 * The draft thoroughly covers author/member/guest cases, tests successful
 * comment retrieval as well as error scenarios with non-existent IDs and posts.
 * All typia.random calls have generic arguments, all API calls and
 * TestValidator.error have proper use of await. Consent arrays correctly
 * constructed with required fields. No type errors, no headers manipulation, no
 * forbidden patterns. All TestValidator calls include descriptive titles. Code
 * is fully aligned to DTOs and available endpoints, with comprehensive comments
 * and scenario description.
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
 *   - O All functionality implemented using only the imports provided in template
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
