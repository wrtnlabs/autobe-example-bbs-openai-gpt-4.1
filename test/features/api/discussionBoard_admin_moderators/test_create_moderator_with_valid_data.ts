import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate creation of a new discussion board moderator with valid data.
 *
 * This test ensures an admin can assign moderator rights to a user by creating
 * a moderator record with a valid `user_identifier` and grant timestamp. It
 * checks that the creation process returns a correct response, with properly
 * set fields and type-valid data.
 *
 * Steps:
 *
 * 1. Generate a valid user_identifier (could be an email or platform
 *    uuid/principal).
 * 2. Issue POST /discussionBoard/admin/moderators with that user_identifier and a
 *    grant date-time (now).
 * 3. Assert the returned record matches the request (user_identifier, granted_at,
 *    revoked_at null), and id is uuid.
 * 4. Type-assert the response shape.
 */
export async function test_api_discussionBoard_admin_moderators_test_create_moderator_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Generate valid moderator data
  const user_identifier = typia.random<string>();
  const granted_at = new Date().toISOString();

  // 2. Attempt to create the moderator
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // 3. Assert response fields match request and required type/format
  typia.assert(moderator);
  TestValidator.equals("user_identifier matches")(moderator.user_identifier)(
    user_identifier,
  );
  TestValidator.equals("granted_at matches")(moderator.granted_at)(granted_at);
  TestValidator.equals("revoked_at is null")(moderator.revoked_at)(null);
  TestValidator.predicate("id is uuid")(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );
}
