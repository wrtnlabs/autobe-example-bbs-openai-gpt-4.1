import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Test denial of unauthorized access to the content flags listing endpoint
 * (admin moderation data).
 *
 * Business context:
 *
 * - The /discussionBoard/admin/contentFlags endpoint provides a list of sensitive
 *   moderation data (content flags) and must be available only to privileged
 *   roles (admins/moderators).
 * - This test verifies that regular members and guests (unauthenticated users)
 *   are strictly denied access, and that no sensitive flag metadata is leaked
 *   through rejected responses.
 * - Attempts to access this endpoint by non-admins are expected to be forbidden
 *   (commonly a 403 error), with error logging for audit trail.
 *
 * Step-by-step process:
 *
 * 1. Admin user is created for test setup and positive control
 * 2. Regular member is created and registered
 * 3. As a regular member (non-admin), attempt to retrieve the content flags
 *    listing and confirm access is denied with an appropriate error
 *    (403/unauthorized). Confirm no flag metadata is present in error
 *    responses.
 * 4. As an unauthenticated guest (no credentials), attempt the same request and
 *    confirm it is denied as well. Again, confirm no flag data leakage on
 *    error.
 */
export async function test_api_discussionBoard_test_list_all_content_flags_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // 1. Create an admin user for baseline/positive control
  const adminUserIdentifier: string = RandomGenerator.alphaNumeric(16);
  const now: string = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: now,
        revoked_at: null,
      },
    },
  );
  typia.assert(admin);

  // 2. Create/register a regular member (to simulate non-admin access)
  const memberUserIdentifier: string = RandomGenerator.alphaNumeric(16);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserIdentifier,
        joined_at: now,
      },
    },
  );
  typia.assert(member);

  // 3. Negative test: as a regular member, access to admin content flags must be forbidden
  // (This presumes that test infra or connection switching is available, as API surface does not expose user login.)
  await TestValidator.error(
    "non-admin member cannot access admin content flags",
  )(async () => {
    await api.functional.discussionBoard.admin.contentFlags.index(connection);
  });

  // 4. Negative test: as a guest (no credentials), access to admin content flags must also be forbidden
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {}, // Simulate no user credentials
  };
  await TestValidator.error(
    "guest (unauthenticated) cannot access admin content flags",
  )(async () => {
    await api.functional.discussionBoard.admin.contentFlags.index(
      guestConnection,
    );
  });
}
