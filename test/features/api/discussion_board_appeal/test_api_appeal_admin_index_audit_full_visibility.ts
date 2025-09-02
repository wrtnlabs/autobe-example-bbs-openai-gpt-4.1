import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that an admin can perform a full-audit visibility search of all
 * appeals.
 *
 * Business context: Regulatory and compliance standards require that admin
 * users have total access to the full inventory of appeals submitted,
 * across all actor roles and timeframes. The test simulates this with
 * multiple users, a moderator (optionally), and various submitted appeals,
 * then exercises advanced search, pagination, filter, and error scenarios.
 *
 * Steps:
 *
 * 1. Register regular users (user1, user2)
 * 2. Create a moderator account (to act as a possible appealant origin)
 * 3. Register an admin, create admin privileges and log in
 * 4. Each non-admin account (user1, user2, and possibly moderator) submits at
 *    least one appeal, using /discussionBoard/user/appeals
 * 5. As admin, exercise the PATCH /discussionBoard/admin/appeals endpoint
 *    with: a. No filter (returns all appeals) b. Pagination (limit and page
 *    options) c. Filtering by appellant_id, status, created_at range, and
 *    reason d. Invalid filter criteria (bad UUIDs, impossible date range,
 *    invalid status string) e. Query that returns zero results (correct
 *    empty set handling)
 * 6. Check correctness: all appeals are visible, filters accurately select,
 *    invalid input is handled, empty sets are properly formed
 */
export async function test_api_appeal_admin_index_audit_full_visibility(
  connection: api.IConnection,
) {
  // --- SETUP: Register users, moderator, admin ---

  // 1. Register user1
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1Password = "TestUser1!123";
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: user1Password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1);

  // 2. Register user2
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = "TestUser2!123";
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2);

  // 3. Register moderator (optional for submitter variety)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name();
  const moderatorPassword = "Moderator!123";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderator);

  // 4. Create admin-eligible user, then elevate to admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = "Admin!12345";
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);
  // Assign admin role
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // Authenticate as admin (tokens in connection)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // --- APPEAL CREATION: Users submit appeals ---

  // User 1 login and submit appeals
  await api.functional.auth.user.login(connection, {
    body: {
      email: user1Email,
      password: user1Password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  const user1Appeals = await ArrayUtil.asyncRepeat(2, async () => {
    const appeal = await api.functional.discussionBoard.user.appeals.create(
      connection,
      {
        body: {
          appellant_id: user1.user.id,
          appeal_reason: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IDiscussionBoardAppeal.ICreate,
      },
    );
    typia.assert(appeal);
    return appeal;
  });

  // User 2 login and submit 1 appeal
  await api.functional.auth.user.login(connection, {
    body: {
      email: user2Email,
      password: user2Password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  const user2Appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: user2.user.id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(user2Appeal);

  // --- ROLE SWITCH: Back to admin for appeal visibility testing ---
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // --- TEST 1: No-filter (all appeals) ---
  const allAppealsPage =
    await api.functional.discussionBoard.admin.appeals.index(connection, {
      body: {} satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(allAppealsPage);
  TestValidator.predicate(
    "admin receives all appeals regardless of origin",
    allAppealsPage.data.length >= 3,
  );
  const allAppealIds = allAppealsPage.data.map((x) => x.id);
  for (const appeal of user1Appeals) {
    TestValidator.predicate(
      `user1's appeal (${appeal.id}) is visible to admin`,
      allAppealIds.includes(appeal.id),
    );
  }
  TestValidator.predicate(
    `user2's appeal (${user2Appeal.id}) is visible to admin`,
    allAppealIds.includes(user2Appeal.id),
  );

  // --- TEST 2: Pagination ---
  const page1 = await api.functional.discussionBoard.admin.appeals.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardAppeal.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination limit for page 1", page1.data.length, 2);
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit value is respected",
    page1.pagination.limit,
    2,
  );
  const page2 = await api.functional.discussionBoard.admin.appeals.index(
    connection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardAppeal.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination current page is 2",
    page2.pagination.current,
    2,
  );

  // --- TEST 3: Filtering by appellant_id (user1)
  const filterByAppellant =
    await api.functional.discussionBoard.admin.appeals.index(connection, {
      body: {
        appellant_id: user1.user.id,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(filterByAppellant);
  for (const appeal of filterByAppellant.data) {
    TestValidator.equals(
      "filtered appeal is by user1",
      appeal.appellant_id,
      user1.user.id,
    );
  }

  // --- TEST 4: Filtering by status ---
  // Using status from one of the created appeals (which is likely 'pending')
  const statusValue =
    allAppealsPage.data.length > 0 ? allAppealsPage.data[0].status : "pending";
  const filterByStatus =
    await api.functional.discussionBoard.admin.appeals.index(connection, {
      body: {
        status: statusValue,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(filterByStatus);
  for (const appeal of filterByStatus.data) {
    TestValidator.equals(
      "appeal status matches filter",
      appeal.status,
      statusValue,
    );
  }

  // --- TEST 5: Filtering by created_at date range
  // Use created_at from appeals to calculate a date range
  const dates = allAppealsPage.data.map((a) => new Date(a.created_at));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const filterByDate = await api.functional.discussionBoard.admin.appeals.index(
    connection,
    {
      body: {
        created_from: minDate.toISOString(),
        created_to: maxDate.toISOString(),
      } satisfies IDiscussionBoardAppeal.IRequest,
    },
  );
  typia.assert(filterByDate);
  TestValidator.equals(
    "date range filter covers all appeals",
    filterByDate.data.length,
    allAppealsPage.data.length,
  );

  // --- TEST 6: Filtering by reason (search substring from a user1 appeal)
  const searchReason = RandomGenerator.substring(user1Appeals[0].appeal_reason);
  const filterByReason =
    await api.functional.discussionBoard.admin.appeals.index(connection, {
      body: {
        appeal_reason: searchReason as any,
      } as any,
    });
  typia.assert(filterByReason);
  TestValidator.predicate(
    "reason search returns at least one match",
    filterByReason.data.length > 0,
  );

  // --- TEST 7: Invalid filters (invalid UUID)
  await TestValidator.error(
    "bad appellant_id yields error or empty set",
    async () => {
      await api.functional.discussionBoard.admin.appeals.index(connection, {
        body: {
          appellant_id: "invalid-uuid" as any,
        } as any,
      });
    },
  );
  // Impossible date range
  const impossibleDate = new Date(2000, 0, 1).toISOString();
  const filterByImpossibleDate =
    await api.functional.discussionBoard.admin.appeals.index(connection, {
      body: {
        created_from: impossibleDate,
        created_to: impossibleDate,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(filterByImpossibleDate);
  TestValidator.equals(
    "impossible date filter yields empty result",
    filterByImpossibleDate.data.length,
    0,
  );

  // --- TEST 8: Empty result (page out of bounds) ---
  const emptyOutOfBounds =
    await api.functional.discussionBoard.admin.appeals.index(connection, {
      body: {
        page: 100,
        limit: 50,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(emptyOutOfBounds);
  TestValidator.equals(
    "pagination out of range is empty array",
    emptyOutOfBounds.data.length,
    0,
  );
  // No explicit cleanup; test relies on isolated state
}
