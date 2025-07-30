import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating a moderator's user_identifier and verifying the change.
 *
 * Business context:
 *
 * - Platform admins may need to change a moderator assignment's user identity
 *   (e.g., after the moderator's email is updated due to SSO migration, or
 *   account merge).
 * - This change must reflect in the moderator mapping and persist as the new
 *   value.
 * - The update should be blocked if the new user_identifier is already present
 *   (but that failure case is covered elsewhere).
 * - All updates should be audit-logged.
 *
 * Test procedure:
 *
 * 1. Create a new discussion board moderator (dependency satisfied).
 * 2. Prepare a new unique user_identifier (simulate as a random string different
 *    from the original).
 * 3. Update the created moderator's user_identifier, using the known moderatorId.
 * 4. Retrieve or inspect the updated moderator record to verify the
 *    user_identifier field matches the new value and that the record's id and
 *    other fields remain valid.
 * 5. Optionally, if audit logs can be checked via API, verify that an update was
 *    logged with the changed field (not implemented here unless such endpoint
 *    exists).
 *
 * Assumptions:
 *
 * - The update API will return the updated moderator record with all fields
 *   populated.
 * - There is no endpoint for direct audit log validation, so success is defined
 *   as returned data matching expectations.
 * - Unique user_identifier enforcement (duplicate rejection) is tested elsewhere.
 */
export async function test_api_discussionBoard_admin_moderators_test_update_moderator_change_user_identifier_success(
  connection: api.IConnection,
) {
  // 1. Create the initial moderator assignment
  const initialUserIdentifier = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const creationInput: IDiscussionBoardModerator.ICreate = {
    user_identifier: initialUserIdentifier,
    granted_at: new Date().toISOString(),
    revoked_at: null,
  };
  const original: IDiscussionBoardModerator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: creationInput,
    });
  typia.assert(original);
  TestValidator.equals("original user identifier")(original.user_identifier)(
    initialUserIdentifier,
  );

  // 2. Prepare a new unique user identifier
  const newUserIdentifier = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  TestValidator.notEquals("new user identifier is different from original")(
    newUserIdentifier,
  )(initialUserIdentifier);

  // 3. Update moderator's user_identifier
  const updateInput: IDiscussionBoardModerator.IUpdate = {
    user_identifier: newUserIdentifier,
  };
  const updated: IDiscussionBoardModerator =
    await api.functional.discussionBoard.admin.moderators.update(connection, {
      moderatorId: original.id,
      body: updateInput,
    });
  typia.assert(updated);

  // 4. Check updated fields
  TestValidator.equals("moderator id unchanged")(updated.id)(original.id);
  TestValidator.equals("user_identifier updated")(updated.user_identifier)(
    newUserIdentifier,
  );
  TestValidator.equals("granted_at unchanged")(updated.granted_at)(
    original.granted_at,
  );
  TestValidator.equals("revoked_at unchanged")(updated.revoked_at ?? null)(
    original.revoked_at ?? null,
  );
}
