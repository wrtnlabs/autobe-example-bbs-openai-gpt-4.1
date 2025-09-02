import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";
import type { IPageIDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin search, pagination, and filtering of password reset
 * records through the admin audit endpoint.
 *
 * This test simulates an administrator retrieving a paginated and filtered
 * list of password reset records for review/compliance. The admin is
 * registered using the join endpoint, ensuring we are simulating with
 * authorized admin user context. We then call PATCH
 * /discussionBoard/admin/passwordResets with a variety of filters
 * (user-specific, used/pending status, expiration date window, and with
 * pagination) and check: (a) response is paginated, (b) filters are applied
 * and reflected in data, (c) all records in the result match the given
 * filter, (d) only admin can access results. Test asserts type correctness
 * for pagination and record structure, and that at least one password reset
 * entry is returned for a basic unfiltered query. It does not cover
 * unauthorized or error flows in this happy path test.
 */
export async function test_api_admin_password_reset_search_and_filtering_success(
  connection: api.IConnection,
) {
  // 1. Register and log in as admin
  const adminJoin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminJoin);

  // 2. Retrieve all password resets (no filters)
  const fullList =
    await api.functional.discussionBoard.admin.passwordResets.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardPasswordReset.IRequest,
      },
    );
  typia.assert(fullList);
  TestValidator.predicate(
    "at least one password reset record returned",
    fullList.data.length > 0,
  );

  // 3. Filter by a specific user (if any record exists)
  const userSpecificId = fullList.data[0]?.discussion_board_user_id;
  if (userSpecificId) {
    const filteredByUser =
      await api.functional.discussionBoard.admin.passwordResets.index(
        connection,
        {
          body: {
            discussion_board_user_id: userSpecificId,
          } satisfies IDiscussionBoardPasswordReset.IRequest,
        },
      );
    typia.assert(filteredByUser);
    TestValidator.predicate(
      "all records belong to the requested user",
      filteredByUser.data.every(
        (x) => x.discussion_board_user_id === userSpecificId,
      ),
    );
  }

  // 4. Filter by status: used (used_at != null)
  const usedReset = fullList.data.find(
    (x) => x.used_at !== null && x.used_at !== undefined,
  );
  if (usedReset) {
    const usedList =
      await api.functional.discussionBoard.admin.passwordResets.index(
        connection,
        {
          body: {
            used_at: usedReset.used_at,
          } satisfies IDiscussionBoardPasswordReset.IRequest,
        },
      );
    typia.assert(usedList);
    TestValidator.predicate(
      "all retrieved resets have matching used_at",
      usedList.data.every((x) => x.used_at === usedReset.used_at),
    );
  }

  // 5. Filter by status: pending (used_at == null); also test that no used resets are included
  const pendingList =
    await api.functional.discussionBoard.admin.passwordResets.index(
      connection,
      {
        body: {
          used_at: null,
        } satisfies IDiscussionBoardPasswordReset.IRequest,
      },
    );
  typia.assert(pendingList);
  TestValidator.predicate(
    "all resets are still pending (used_at is null)",
    pendingList.data.every(
      (x) => x.used_at === null || x.used_at === undefined,
    ),
  );

  // 6. Filter by expiration window, if expirations are present
  const sampleReset = fullList.data[0];
  if (sampleReset) {
    const expireStart = sampleReset.expires_at;
    const expireEnd = sampleReset.expires_at;
    const expireFilterList =
      await api.functional.discussionBoard.admin.passwordResets.index(
        connection,
        {
          body: {
            expires_at_gte: expireStart,
            expires_at_lte: expireEnd,
          } satisfies IDiscussionBoardPasswordReset.IRequest,
        },
      );
    typia.assert(expireFilterList);
    TestValidator.predicate(
      "all resets' expires_at are within the specified window",
      expireFilterList.data.every(
        (x) => x.expires_at >= expireStart && x.expires_at <= expireEnd,
      ),
    );
  }

  // 7. Paginated access: limit to 1 record and check pagination metadata
  const paginatedList =
    await api.functional.discussionBoard.admin.passwordResets.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardPasswordReset.IRequest,
      },
    );
  typia.assert(paginatedList);
  TestValidator.equals(
    "pagination limit is respected",
    paginatedList.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination is on first page",
    paginatedList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "list contains at most one record",
    paginatedList.data.length <= 1,
  );
}
