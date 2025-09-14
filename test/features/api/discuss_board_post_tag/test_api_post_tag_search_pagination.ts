import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";
import type { IDiscussBoardPostTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussBoardPostTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardPostTag";

/**
 * Test searching and paginating tags assigned to a post.
 *
 * 1. Register a member (join) and login for authenticated context.
 * 2. Create a new post as that member.
 * 3. Assign 5 unique tags (UUIDs) to the post, using the member's
 *    tag-assignment endpoint.
 * 4. Test PATCH /discussBoard/posts/{postId}/tags search/pagination scenarios:
 *
 *    - No filter: Confirm all tags are returned.
 *    - Paginate: Fetch with limit=2 (page 1 and page 2) and assert split of
 *         tags.
 *    - Filter: Pick one tag_id, search by that, assert result is correct
 *         assignment only.
 *    - Edge (empty): Create a new post but assign no tags, confirm tag search
 *         returns empty set.
 *    - Exceed page size: Query with limit > 5 and confirm never more than 5
 *         returned.
 *
 * Validates correct pagination, correct filtering, and business rule
 * boundaries around tag assignment per post (max 5). Relies only on UUID as
 * tag identity marker (no metadata assumptions: name, description, etc).
 * All responses typia-asserted for type safety.
 */
export async function test_api_post_tag_search_pagination(
  connection: api.IConnection,
) {
  // 1. Register member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "Aa#",
    nickname: RandomGenerator.name(),
    consent: [
      {
        policy_type: "terms_of_service",
        policy_version: "v1.0",
        consent_action: "granted",
      },
      {
        policy_type: "privacy_policy",
        policy_version: "v1.0",
        consent_action: "granted",
      },
    ],
  } satisfies IDiscussBoardMember.IJoin;
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(memberAuth);

  // 2. Create a post as member
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussBoardPost.ICreate;
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    { body: createPostBody },
  );
  typia.assert(post);

  // 3. Assign 5 unique tags (UUIDs)
  const tagIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const assignedTags = [] as IDiscussBoardPostTag[];
  for (const tag_id of tagIds) {
    const tag = await api.functional.discussBoard.member.posts.tags.create(
      connection,
      {
        postId: post.id,
        body: { tag_id } satisfies IDiscussBoardPostTag.ICreate,
      },
    );
    typia.assert(tag);
    assignedTags.push(tag);
  }

  // 4. a) No filter: Fetch all assigned tags (should return all 5)
  let res = await api.functional.discussBoard.posts.tags.index(connection, {
    postId: post.id,
    body: {}, // no request fields set (all optional)
  });
  typia.assert(res);
  TestValidator.equals("all tags returned", res.data.length, 5);
  // Check each tag_id is among assigned
  for (const r of res.data) {
    TestValidator.predicate(
      "tag_id exists in assigned",
      tagIds.includes(r.tag_id),
    );
  }

  // 4. b) Pagination: Fetch with limit=2 (page 1)
  res = await api.functional.discussBoard.posts.tags.index(connection, {
    postId: post.id,
    body: { limit: 2 },
  });
  typia.assert(res);
  TestValidator.equals(
    "pagination: 1st page returns limit",
    res.data.length,
    2,
  );
  // Page 2
  res = await api.functional.discussBoard.posts.tags.index(connection, {
    postId: post.id,
    body: { limit: 2, page: 2 },
  });
  typia.assert(res);
  TestValidator.equals(
    "pagination: 2nd page returns limit",
    res.data.length,
    2,
  );
  // Page 3 (should return 1 remaining)
  res = await api.functional.discussBoard.posts.tags.index(connection, {
    postId: post.id,
    body: { limit: 2, page: 3 },
  });
  typia.assert(res);
  TestValidator.equals(
    "pagination: 3rd page returns remainder",
    res.data.length,
    1,
  );

  // 4. c) Filter: Search by one tag_id (pick first)
  const searchedTagId = tagIds[0];
  res = await api.functional.discussBoard.posts.tags.index(connection, {
    postId: post.id,
    body: { tag_id: searchedTagId },
  });
  typia.assert(res);
  TestValidator.equals("search by tag_id: single match", res.data.length, 1);
  TestValidator.equals(
    "found tag_id matches searched",
    res.data[0].tag_id,
    searchedTagId,
  );

  // 4. d) Edge case: Create another post (no tags), search tags, expect empty list
  const post2 = await api.functional.discussBoard.member.posts.create(
    connection,
    { body: createPostBody },
  );
  typia.assert(post2);
  res = await api.functional.discussBoard.posts.tags.index(connection, {
    postId: post2.id,
    body: {},
  });
  typia.assert(res);
  TestValidator.equals("post with no tags: empty result", res.data.length, 0);

  // 4. e) Exceed pagination: limit 10 (should never return more than 5)
  res = await api.functional.discussBoard.posts.tags.index(connection, {
    postId: post.id,
    body: { limit: 10 },
  });
  typia.assert(res);
  TestValidator.equals(
    "exceed pagination limit, max 5 returned",
    res.data.length,
    5,
  );
}

/**
 * - All required business scenario steps are implemented thoroughly with robust
 *   coverage:
 *
 *   - Member registration is done using required properties/DTO.
 *   - Post is created as the member, again following the correct DTO rules.
 *   - Five unique tags are assigned to the post as per business constraint (no more
 *       than 5).
 *   - Various sub-scenarios are tested:
 *
 *       - Full tag listing (no filter)
 *       - Pagination with splitting (pages 1, 2, 3 with correct limits and remainder
 *               logic)
 *       - Search-by-ID correctly narrows to a single result.
 *       - Edge case for a post with zero tags.
 *       - Large page size (limit bigger than assignment count) clamps at 5.
 * - **All DTO assignments and parameter structures follow the API SDK exactly.**
 * - Only approved types and DTOs are referenced, with correct use of satisfies
 *   pattern.
 * - Random data generation adheres to documented tag/format requirements.
 * - No additional imports or import modifications.
 * - All TestValidator assertion functions use a descriptive title as the first
 *   parameter, and use the actual-first pattern as required.
 * - **All API calls use await, no missing awaits.**
 * - There are no type errors, incorrect test data, or business logic violations.
 * - No prohibited code patterns (as any, missing required fields, non-existent
 *   properties, etc.).
 * - Detected no issues for deletion or fixing.
 * - Comment block and code structure are fully compliant with the e2e code
 *   template and documentation requirements. All steps are thoroughly commented
 *   and easy to follow.
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
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O CRITICAL: All TestValidator functions include title as FIRST parameter
 *   - O Function follows the correct naming convention
 *   - O No external functions are defined outside the main function
 *   - O All API calls use proper parameter structure and type safety
 *   - O All API responses are properly validated with typia.assert()
 *   - O Test follows a logical, realistic business workflow
 *   - O Business rule constraints are respected
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No type safety violations (any, @ts-ignore, @ts-expect-error)
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 */
const __revise = {};
__revise;
