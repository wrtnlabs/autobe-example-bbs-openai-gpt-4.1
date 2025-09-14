import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardComment";
import type { IDiscussBoardCommentReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentReaction";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";

/**
 * Validate detail retrieval and access control for comment reaction entity
 * by members.
 *
 * This test ensures:
 *
 * 1. A member (the owner of the reaction) can retrieve the full details of
 *    their own comment reaction.
 * 2. A different member cannot access another member’s reaction details
 *    (should be denied/access forbidden).
 * 3. The API returns a not found/error for a random, non-existent reactionId.
 *
 * Step-by-step:
 *
 * 1. Register the first member and keep their credentials (for later re-login
 *    if needed)
 * 2. As first member, create a discussBoard post
 * 3. As first member, add a comment to the post
 * 4. As first member, create a reaction (like or dislike) to the comment;
 *    capture reaction id
 * 5. As first member, retrieve the reaction detail via GET
 *    /discussBoard/member/commentReactions/{commentReactionId} and check
 *    full record
 * 6. Register the second member, keep their credentials
 * 7. Login (authenticate) as the second member (context switch)
 * 8. Try to retrieve the first member's reaction via the same endpoint; this
 *    must be denied (error/assertion)
 * 9. Try to retrieve a non-existent commentReactionId; confirm API returns
 *    error/not-found
 */
export async function test_api_comment_reaction_member_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Register the first member
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(12);
  const member1Nickname = RandomGenerator.name();
  const consentPayload = [
    {
      policy_type: "privacy_policy",
      policy_version: "v1",
      consent_action: "granted",
    },
    {
      policy_type: "terms_of_service",
      policy_version: "v1",
      consent_action: "granted",
    },
  ];
  const member1Authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      nickname: member1Nickname,
      consent: consentPayload,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(member1Authorized);

  // 2. Create a post as member1
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 12,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Add a comment as member1
  const comment =
    await api.functional.discussBoard.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies IDiscussBoardComment.ICreate,
    });
  typia.assert(comment);

  // 4. Create a comment reaction as member1 (choose like/dislike randomly)
  const reactionType = RandomGenerator.pick(["like", "dislike"] as const);
  const commentReaction =
    await api.functional.discussBoard.member.commentReactions.create(
      connection,
      {
        body: {
          discuss_board_comment_id: comment.id,
          reaction_type: reactionType,
        } satisfies IDiscussBoardCommentReaction.ICreate,
      },
    );
  typia.assert(commentReaction);

  // 5. Retrieve the reaction detail (owner access)
  const reactionDetail =
    await api.functional.discussBoard.member.commentReactions.at(connection, {
      commentReactionId: commentReaction.id,
    });
  typia.assert(reactionDetail);
  TestValidator.equals(
    "retrieved reaction matches created reaction (owner access)",
    reactionDetail,
    commentReaction,
  );

  // 6. Register the second member
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(12);
  const member2Nickname = RandomGenerator.name();
  const member2Authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      nickname: member2Nickname,
      consent: consentPayload,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(member2Authorized);

  // 7. Login as the second member (context switch)
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
    } satisfies IDiscussBoardMember.ILogin,
  });

  // 8. Try to retrieve the first member's reaction (should be denied)
  await TestValidator.error(
    "non-owner member cannot access another's comment reaction detail",
    async () => {
      await api.functional.discussBoard.member.commentReactions.at(connection, {
        commentReactionId: commentReaction.id,
      });
    },
  );

  // 9. Try to retrieve a detail for a non-existent commentReactionId
  const fakeReactionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching detail for non-existent commentReactionId returns error",
    async () => {
      await api.functional.discussBoard.member.commentReactions.at(connection, {
        commentReactionId: fakeReactionId,
      });
    },
  );
}

/**
 * The draft implementation follows the scenario and all E2E requirements very
 * well:
 *
 * - All prerequisites are established: two members are registered via join
 *   endpoints, post and comment are created and logically connected, then the
 *   comment gets a reaction as required.
 * - Values for randomized/unique fields (emails, nicknames, passwords) are
 *   generated using the correct RandomGenerator and typia.random patterns.
 * - Authentication step is handled correctly. On member switching, the login
 *   endpoint is called appropriately with required credentials.
 * - API function invocations use `await` everywhere (checked for every call,
 *   including TestValidator.error async callbacks).
 * - All necessary type validations are done using typia.assert (after every
 *   entity creation and retrieval).
 * - Required business/authorization error scenarios are robustly tested (other
 *   member's access to reaction, and not-found scenario), with proper use of
 *   TestValidator.error for the negative test cases -- both have async
 *   callbacks and are properly awaited.
 * - No missing required fields, no type bypassing techniques, and only required
 *   and allowed properties are set on all DTOs. There is no use of as any or
 *   missing required fields testing.
 * - Variable declarations for body data use satisfies syntax, not type
 *   annotation.
 * - There are no additional import statements, template boundary is respected,
 *   and all validations, business logic, and edge cases requested in the
 *   scenario are covered.
 * - No status code introspection nor error message analysis, only business logic
 *   error and rejection patterns tested.
 * - Edge cases for null/undefined are not present (there are no nullable
 *   assignment issues in this scenario).
 * - All TestValidator functions include titles as the first parameter and respect
 *   placement/order.
 * - No helper functions outside the main implementation, no manipulation of
 *   connection.headers, and account context is switched only through join/login
 *   functions.
 *
 * No issues are found; the code is ready for production and passes all E2E test
 * requirements for correctness and security.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O TestValidator.error with async callback has `await`
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Proper data dependencies and setup procedures
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
 *   - O No fictional functions or types from examples are used
 */
const __revise = {};
__revise;
