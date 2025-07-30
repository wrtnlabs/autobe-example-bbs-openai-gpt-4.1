import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test revoking moderator privileges by updating an existing moderator record.
 *
 * This test simulates the workflow of an admin revoking a moderator's
 * privileges on a discussion board. It covers:
 *
 * 1. Creating a new moderator assignment as a prerequisite (dependency setup).
 * 2. Revoking the moderator's privileges by setting the revoked_at timestamp using
 *    the update endpoint.
 * 3. Verifying that the updated record includes the correct revoked_at timestamp,
 *    and that the moderator is no longer active (revoked_at !== null).
 * 4. Confirming that audit fields (granted_at, user_identifier) remain unchanged,
 *    except for the revoked_at field.
 *
 * Note: Since no GET endpoint is available, validation is performed using the
 * update API response.
 */
export async function test_api_discussionBoard_test_update_moderator_revoke_privileges_success(
  connection: api.IConnection,
) {
  // 1. Create new moderator assignment (dependency setup)
  const user_identifier: string = RandomGenerator.name();
  const grant_time: string = new Date().toISOString();
  const createInput: IDiscussionBoardModerator.ICreate = {
    user_identifier,
    granted_at: grant_time,
    revoked_at: null,
  };
  const created = await api.functional.discussionBoard.admin.moderators.create(
    connection,
    { body: createInput },
  );
  typia.assert(created);
  TestValidator.equals("created revoked_at is null")(created.revoked_at)(null);
  TestValidator.equals("created user_identifier matches")(
    created.user_identifier,
  )(user_identifier);

  // 2. Update moderator by setting revoked_at
  const revoke_time: string = new Date(Date.now() + 60 * 1000).toISOString();
  const updateInput: IDiscussionBoardModerator.IUpdate = {
    revoked_at: revoke_time,
  };
  const updated = await api.functional.discussionBoard.admin.moderators.update(
    connection,
    {
      moderatorId: created.id,
      body: updateInput,
    },
  );
  typia.assert(updated);

  // 3. Validate update - revoked_at is set, other fields remain unchanged
  TestValidator.equals("moderator id remains")(updated.id)(created.id);
  TestValidator.equals("user_identifier unchanged")(updated.user_identifier)(
    created.user_identifier,
  );
  TestValidator.equals("granted_at unchanged")(updated.granted_at)(
    created.granted_at,
  );
  TestValidator.equals("revoked_at is set as updated")(updated.revoked_at)(
    revoke_time,
  );
}
