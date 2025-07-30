import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validate that a moderator can retrieve details of a specific content flag by
 * its UUID.
 *
 * This test verifies the following business workflow:
 *
 * 1. A moderator (authorized user) creates a new content flag (for a post or
 *    comment).
 * 2. The test retrieves the details of the newly created flag using its unique
 *    identifier.
 * 3. The response is validated for all critical metadata: id, flag type, source,
 *    creator, target, notes, and timestamps.
 * 4. Error handling is checked for non-existent flagId.
 * 5. Error handling is checked for unauthorized access (if possible in system
 *    context).
 *
 * This ensures reliable moderation review and correct role-based flag access.
 */
export async function test_api_discussionBoard_moderator_contentFlags_test_get_specific_content_flag_details_as_moderator(
  connection: api.IConnection,
) {
  // 1. Create a new content flag as a moderator
  const createInput: IDiscussionBoardContentFlag.ICreate = {
    post_id: typia.random<string & tags.Format<"uuid">>(),
    comment_id: null,
    flagged_by_moderator_id: typia.random<string & tags.Format<"uuid">>(),
    flagged_by_admin_id: null,
    flag_type: "test-abuse",
    flag_source: "manual",
    flag_details: "Test case: Scenario E2E moderation notes.",
  };
  const created: IDiscussionBoardContentFlag =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(created);

  // 2. Retrieve the content flag detail by its unique id
  const loaded: IDiscussionBoardContentFlag =
    await api.functional.discussionBoard.moderator.contentFlags.at(connection, {
      contentFlagId: created.id,
    });
  typia.assert(loaded);

  // 3. Validate all expected metadata fields
  TestValidator.equals("id matches")(loaded.id)(created.id);
  TestValidator.equals("flag type matches")(loaded.flag_type)(
    createInput.flag_type,
  );
  TestValidator.equals("flag source matches")(loaded.flag_source)(
    createInput.flag_source,
  );
  TestValidator.equals("flag details matches")(loaded.flag_details)(
    createInput.flag_details,
  );
  TestValidator.equals("flagged_by_moderator_id matches")(
    loaded.flagged_by_moderator_id,
  )(createInput.flagged_by_moderator_id);
  TestValidator.equals("flagged_by_admin_id matches")(
    loaded.flagged_by_admin_id,
  )(createInput.flagged_by_admin_id);
  TestValidator.equals("post_id matches")(loaded.post_id)(createInput.post_id);
  TestValidator.equals("comment_id matches")(loaded.comment_id)(
    createInput.comment_id,
  );
  TestValidator.predicate("created_at set")(
    typeof loaded.created_at === "string" && !!loaded.created_at,
  );
  // cleared_at may be null if not resolved yet
  TestValidator.predicate("cleared_at field exists")("cleared_at" in loaded);

  // 4. Attempt to get a flag with an invalid UUID (should throw error)
  await TestValidator.error("should throw for non-existent flag")(() =>
    api.functional.discussionBoard.moderator.contentFlags.at(connection, {
      contentFlagId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 5. (Optional/if implementable) Simulate forbidden access
  // (Omitted, as role simulation/control for unauthorized user is not present in test API context.)
}
