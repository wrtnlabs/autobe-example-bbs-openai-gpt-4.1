import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";

/**
 * Validate updating of an existing ban record through the moderator or administrator endpoint.
 *
 * Scenario steps:
 * 1. (Preparation) Create an active temporary ban (valid permanence, future expires_at, valid moderator ID).
 * 2. (a) (Positive) As moderator/admin, update that ban: modify ban_reason, toggle 'permanent', and push expires_at forward.
 *    - Confirm returned record is updated accordingly.
 * 3. (b) (Negative) Try updating a non-existent ban (random UUID), expect not found error.
 * 4. (c) (Negative) Set expires_at to a past value for an active ban, expect validation error.
 * 5. (d) (Negative) Update a soft-deleted ban, expect update is rejected (returns not found or rejected by business rules).
 * 6. (e) (Negative) Attempt update as a non-moderator/non-admin (simulate by using an unprivileged moderator_id – in practice, this test can only be covered if available via dependency injection or token context; in this stub, show structure of the test).
 */
export async function test_api_discussionBoard_bans_test_update_ban_with_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // 1. Preparation: create an active (temporary) ban
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const moderator_id = typia.random<string & tags.Format<"uuid">>();
  const member_id = typia.random<string & tags.Format<"uuid">>();
  
  const ban = await api.functional.discussionBoard.bans.post(connection, {
    body: {
      member_id,
      moderator_id,
      ban_reason: "Temporary harassment ban",
      permanent: false,
      expires_at: future.toISOString(),
    } satisfies IDiscussionBoardBan.ICreate,
  });
  typia.assert(ban);

  // 2. (a) Positive: Update: change reason, make permanent, clear expires_at
  const new_reason = "Escalated to permanent for repeat violation";
  const updated = await api.functional.discussionBoard.bans.putById(connection, {
    id: ban.id,
    body: {
      ban_reason: new_reason,
      permanent: true,
      expires_at: null,
    } satisfies IDiscussionBoardBan.IUpdate,
  });
  typia.assert(updated);
  TestValidator.equals("ban is now permanent")(updated.permanent)(true);
  TestValidator.equals("ban reason updated")(updated.ban_reason)(new_reason);
  TestValidator.equals("expires_at cleared for permanent")(updated.expires_at)(null);

  // 3. (b) Negative: Non-existent ban
  await TestValidator.error("not found for non-existent ban")(
    () =>
      api.functional.discussionBoard.bans.putById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ban_reason: "Should not work",
        },
      })
  );

  // 4. (c) Negative: expires_at in the past
  const past = new Date(now.getTime() - 60 * 60 * 1000); // -1 hour
  await TestValidator.error("expires_at in the past is not allowed")(
    () =>
      api.functional.discussionBoard.bans.putById(connection, {
        id: ban.id,
        body: {
          expires_at: past.toISOString(),
        },
      })
  );

  // 5. (d) Negative: soft-deleted ban
  // Soft-delete by updating deleted_at, then try an update
  await api.functional.discussionBoard.bans.putById(connection, {
    id: ban.id,
    body: {
      deleted_at: now.toISOString(),
    },
  });
  await TestValidator.error("update on deleted ban fails")(
    () =>
      api.functional.discussionBoard.bans.putById(connection, {
        id: ban.id,
        body: {
          ban_reason: "Attempt after deletion",
        },
      })
  );
  // 6. (e) Negative: no mod/admin rights –
  // Role enforcement usually handled at middleware – if API allows, try with invalid moderator_id (not strictly possible in this context unless role association is handled by token, but this step is shown for logical completeness.)
}