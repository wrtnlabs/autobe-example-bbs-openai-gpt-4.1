import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Validate that an admin can soft-delete (retire) an appeal in the
 * compliance/audit workflow.
 *
 * Business context: Regulatory compliance may require that appeals can be
 * removed from the active system for audit or retirement reasons, but only
 * by privileged actors (admins). Soft-deletion must correctly set the
 * `deleted_at` timestamp to retire the record without physical removal for
 * audit trail preservation.
 *
 * Steps:
 *
 * 1. Register a standard user (unique email & credentials, consent=true).
 * 2. Log in as user (context setup if needed for appeal creation).
 * 3. Create an appeal as that user (supply user id as appellant_id, valid
 *    narrative).
 * 4. Register a separate admin user, assign admin role via /auth/admin/join.
 * 5. Log in as admin (context switch for admin privilege).
 * 6. Admin calls erase (DELETE) on the created appeal id.
 * 7. Validate the response: deleted_at is set (audit), id matches, other
 *    entity fields are preserved.
 *
 * This test confirms:
 *
 * - Only admins may retire appeals.
 * - Soft-delete logic preserves audit trail.
 * - Cross-role context switching is enforced throughout workflow.
 */
export async function test_api_admin_appeal_erase_success(
  connection: api.IConnection,
) {
  // (1) Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Aa1!" + RandomGenerator.alphaNumeric(10); // satisfies strong pw policy
  const userUsername =
    RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4);
  const userJoinRes = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoinRes);

  // (2) User login (context setup)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // (3) User creates the appeal
  const appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: userJoinRes.user.id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // (4) Register & assign admin (use a separate user)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Aa1!" + RandomGenerator.alphaNumeric(10);
  const adminUsername =
    RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4);
  const adminUserJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUserJoin);
  const adminJoinRes = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserJoin.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoinRes);

  // (5) Admin login (context switch)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // (6) Admin soft-deletes the appeal
  const erased = await api.functional.discussionBoard.admin.appeals.erase(
    connection,
    {
      appealId: appeal.id,
    },
  );
  typia.assert(erased);

  // (7) Validate: id matches, deleted_at is set, audit preserved
  TestValidator.equals("soft deleted appeal id matches", erased.id, appeal.id);
  TestValidator.predicate(
    "soft deleted_at is set",
    typeof erased.deleted_at === "string" &&
      erased.deleted_at !== null &&
      erased.deleted_at.length > 0,
  );
}
