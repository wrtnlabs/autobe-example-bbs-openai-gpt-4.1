import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate retrieval of moderator details by moderatorId.
 *
 * This test ensures that, when a valid moderatorId is provided, the API returns
 * the complete moderator record exactly as persisted, including
 * user_identifier, grant and revoke timestamps, and all audit fields as
 * created. This validates that the moderator is retrievable, all properties
 * match, and data integrity is intact.
 *
 * Steps:
 *
 * 1. Create a moderator record (capture all properties used at creation).
 * 2. Retrieve the moderator details by the moderator's id via the API.
 * 3. Assert that all returned fields (id, user_identifier, granted_at, revoked_at)
 *    match exactly those that were persisted.
 */
export async function test_api_discussionBoard_admin_moderators_test_get_moderator_details_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a moderator
  const createInput: IDiscussionBoardModerator.ICreate = {
    user_identifier: RandomGenerator.alphabets(10),
    granted_at: new Date().toISOString(),
    revoked_at:
      Math.random() > 0.5
        ? new Date(Date.now() + 86_400_000).toISOString()
        : null,
  };
  const created: IDiscussionBoardModerator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: createInput,
    });
  typia.assert(created);
  TestValidator.equals("user_identifier")(created.user_identifier)(
    createInput.user_identifier,
  );
  TestValidator.equals("granted_at")(created.granted_at)(
    createInput.granted_at,
  );
  TestValidator.equals("revoked_at")(created.revoked_at ?? null)(
    createInput.revoked_at ?? null,
  );

  // 2. Retrieve the moderator details by id
  const retrieved: IDiscussionBoardModerator =
    await api.functional.discussionBoard.admin.moderators.at(connection, {
      moderatorId: created.id,
    });
  typia.assert(retrieved);

  // 3. Assert all returned fields match persisted values
  TestValidator.equals("id matches")(retrieved.id)(created.id);
  TestValidator.equals("user_identifier matches")(retrieved.user_identifier)(
    created.user_identifier,
  );
  TestValidator.equals("granted_at matches")(retrieved.granted_at)(
    created.granted_at,
  );
  TestValidator.equals("revoked_at matches")(retrieved.revoked_at ?? null)(
    created.revoked_at ?? null,
  );
}
