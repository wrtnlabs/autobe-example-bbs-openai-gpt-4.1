import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVerificationToken";
import type { IPageIDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVerificationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin advanced search and secure pagination for verification
 * token index.
 *
 * Ensures an admin can use the verification token index endpoint for
 * precise searches with advanced filtering, proper pagination, and strict
 * privacy compliance.
 *
 * Steps:
 *
 * 1. Programmatically register an admin using /auth/admin/join, simulating a
 *    verified user context.
 * 2. Run PATCH /discussionBoard/admin/verificationTokens with various filter
 *    and pagination combos: a. Basic default search (no filters). b. Filter
 *    by purpose; filter by expired tokens (expires_at_to); filter by unused
 *    (used=false). c. Pagination: limit/page parameter edge cases,
 *    including out-of-bounds. d. Complex combo filter
 *    (purpose+used+expires_at_from).
 * 3. For each response: a. Assert only summary (non-sensitive) fields are ever
 *    returned in data. b. Assert privacy: no fields named 'token',
 *    containing 'value', 'secret', or 'raw'. c. Verify results match the
 *    intended filters (e.g., purpose, used flag, expiry windows). d.
 *    Validate pagination metadata reflects request.
 * 4. Extra coverage for empty results, structural assertions, and boundary
 *    behaviors.
 */
export async function test_api_verification_token_index_search_and_pagination_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const authorized = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(authorized);

  // Allowed summary keys exactly by IDiscussionBoardVerificationToken.ISummary
  const SUMMARY_KEYS = [
    "id",
    "discussion_board_user_id",
    "purpose",
    "expires_at",
    "used_at",
    "created_at",
  ];

  // Helper to assert only allowed keys in returned token data
  function assert_summary_shape(token: any) {
    const actualKeys = Object.keys(token).sort();
    TestValidator.equals(
      "token summary fields match DTO strictly",
      actualKeys,
      [...SUMMARY_KEYS].sort(),
    );
  }
  function assert_no_sensitive_fields(token: any) {
    TestValidator.predicate(
      "no sensitive token/secret/field exposed",
      !("token" in token) &&
        !Object.keys(token).some(
          (x) =>
            x.toLowerCase().includes("value") ||
            x.toLowerCase().includes("secret") ||
            x.toLowerCase().includes("raw"),
        ),
    );
  }

  // Step 2: Basic search (default search, no filters)
  const basicPage =
    await api.functional.discussionBoard.admin.verificationTokens.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(basicPage);
  TestValidator.equals(
    "pagination default page=1",
    basicPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    basicPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination record count >= 0",
    basicPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    basicPage.pagination.pages >= 1,
  );
  basicPage.data.forEach((t) => {
    assert_summary_shape(t);
    assert_no_sensitive_fields(t);
  });

  // Step 3: Purpose filter
  if (basicPage.data.length > 0) {
    const filterPurpose = basicPage.data[0].purpose;
    const pagePurpose =
      await api.functional.discussionBoard.admin.verificationTokens.index(
        connection,
        {
          body: { purpose: filterPurpose },
        },
      );
    typia.assert(pagePurpose);
    pagePurpose.data.forEach((row) => {
      assert_summary_shape(row);
      assert_no_sensitive_fields(row);
      TestValidator.equals(
        "purpose filter matches",
        row.purpose,
        filterPurpose,
      );
    });
  }

  // Step 4: Expired tokens (expires_at before now)
  {
    const nowIso = new Date().toISOString();
    const expiredPage =
      await api.functional.discussionBoard.admin.verificationTokens.index(
        connection,
        {
          body: { expires_at_to: nowIso },
        },
      );
    typia.assert(expiredPage);
    expiredPage.data.forEach((token) => {
      assert_summary_shape(token);
      assert_no_sensitive_fields(token);
      TestValidator.predicate(
        "expired token expires_at <= now",
        token.expires_at <= nowIso,
      );
    });
  }

  // Step 5: Used=false (unused tokens)
  {
    const unusedPage =
      await api.functional.discussionBoard.admin.verificationTokens.index(
        connection,
        {
          body: { used: false },
        },
      );
    typia.assert(unusedPage);
    unusedPage.data.forEach((token) => {
      assert_summary_shape(token);
      assert_no_sensitive_fields(token);
      TestValidator.equals(
        "token unused has no used_at (null)",
        token.used_at,
        null,
      );
    });
  }

  // Step 6: Pagination edge (page 2, limit 2)
  {
    const paged =
      await api.functional.discussionBoard.admin.verificationTokens.index(
        connection,
        {
          body: { page: 2, limit: 2 },
        },
      );
    typia.assert(paged);
    TestValidator.equals("pagination page=2", paged.pagination.current, 2);
    TestValidator.equals("pagination limit=2", paged.pagination.limit, 2);
    paged.data.forEach(assert_summary_shape);
    paged.data.forEach(assert_no_sensitive_fields);
  }

  // Step 7: Out-of-bound page (very high page)
  {
    const impossiblePage =
      await api.functional.discussionBoard.admin.verificationTokens.index(
        connection,
        {
          body: { page: 9999 },
        },
      );
    typia.assert(impossiblePage);
    TestValidator.equals(
      "pagination high page",
      impossiblePage.pagination.current,
      9999,
    );
    // Empty data is acceptable for OOB page
    impossiblePage.data.forEach(assert_summary_shape);
    impossiblePage.data.forEach(assert_no_sensitive_fields);
  }

  // Step 8: Combined filter (purpose+used+expires_at_from)
  if (basicPage.data.length > 0) {
    const usedToken = basicPage.data.find(
      (r) => r.used_at !== null && r.used_at !== undefined,
    );
    if (usedToken) {
      const comboPage =
        await api.functional.discussionBoard.admin.verificationTokens.index(
          connection,
          {
            body: {
              used: true,
              purpose: usedToken.purpose,
              expires_at_from: usedToken.expires_at,
            },
          },
        );
      typia.assert(comboPage);
      comboPage.data.forEach((row) => {
        assert_summary_shape(row);
        assert_no_sensitive_fields(row);
        TestValidator.predicate(
          "token is used",
          row.used_at !== null && row.used_at !== undefined,
        );
        TestValidator.equals(
          "purpose matches combo filter",
          row.purpose,
          usedToken.purpose,
        );
        TestValidator.predicate(
          "expires_at >= combo filter",
          row.expires_at >= usedToken.expires_at,
        );
      });
    }
  }

  // Step 9: Privacy check on all examples: no token, no secret, no value/raw
  [basicPage].forEach((page) => {
    page.data.forEach(assert_no_sensitive_fields);
  });
}
