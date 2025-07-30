import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate that updating a moderation action with an invalid or non-existent ID
 * fails as expected.
 *
 * This test ensures that API correctly rejects attempts to update a moderation
 * action using a UUID that does not correspond to any existing record. This
 * situation can arise if a client attempts to update a moderation action that
 * was deleted or never existed, which must yield a not-found/error result and
 * not a successful update. This protects audit integrity and prevents false
 * update acknowledgements.
 *
 * Workflow:
 *
 * 1. Grant moderator privilege to the test user to ensure access.
 * 2. Attempt to update a moderation action with a valid UUID that does NOT exist.
 * 3. Provide a syntactically valid update body with at least one updatable field.
 * 4. Assert that the API returns an error (not a success result).
 *
 * Notes:
 *
 * - This test cannot directly verify DB state, but by asserting that the update
 *   fails and no success object is returned, it ensures compliance with
 *   business rules.
 * - TestValidator.error is used to assert error throwing, as required by the
 *   testing contract for such scenarios.
 */
export async function test_api_discussionBoard_test_update_moderation_action_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Ensure moderator access by creating a moderator record.
  const user_identifier: string = RandomGenerator.alphaNumeric(10);
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 2. Use a random UUID (that is statistically extremely unlikely to exist) as the moderationActionId.
  const invalidModerationActionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare a valid update body using an updatable field (e.g., action_type and action_details).
  const updateBody: IDiscussionBoardModerationAction.IUpdate = {
    action_type: "edit",
    action_details: "Attempt to update non-existent moderation action.",
  };

  // 4. Attempt the update and assert that an error is thrown.
  await TestValidator.error(
    "API should return error on invalid moderationActionId",
  )(async () => {
    await api.functional.discussionBoard.moderator.moderationActions.update(
      connection,
      {
        moderationActionId: invalidModerationActionId,
        body: updateBody,
      },
    );
  });
}
