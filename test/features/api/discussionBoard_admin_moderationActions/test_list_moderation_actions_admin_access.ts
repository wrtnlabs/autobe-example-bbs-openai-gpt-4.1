import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate that an admin can retrieve the paginated moderation actions list
 * with correct structure and data integrity.
 *
 * 1. Seed the system with multiple moderation action records via POST endpoint,
 *    ensuring a diverse range of action types and admin actors.
 * 2. Fetch the moderation actions list as an admin using the GET endpoint.
 * 3. Confirm the result is a paginated summary object
 *    (IPageIDiscussionBoardModerationAction.ISummary).
 * 4. Assert pagination metadata (current, limit, records, pages) reflect the
 *    seeded dataset size, and pages > 1 (pagination triggered).
 * 5. Each returned moderation action summary must contain an id (UUID string), and
 *    (if present) a string actor_type. IDs returned must match created
 *    records.
 * 6. Every moderation action summary listed contains no missing or corrupted data
 *    for admin view.
 */
export async function test_api_discussionBoard_admin_moderationActions_test_list_moderation_actions_admin_access(
  connection: api.IConnection,
) {
  // 1. Seed 110 moderation actions for pagination and diversity
  const NUM_ACTIONS = 110;
  const ACTION_TYPES = ["delete", "edit", "warn", "ban", "restore"];
  const moderationActionsCreated = await ArrayUtil.asyncRepeat(NUM_ACTIONS)(
    async () => {
      const body = {
        actor_admin_id: typia.random<string & tags.Format<"uuid">>(),
        action_type: RandomGenerator.pick(ACTION_TYPES),
        action_details: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardModerationAction.ICreate;
      const created =
        await api.functional.discussionBoard.admin.moderationActions.create(
          connection,
          { body },
        );
      typia.assert(created);
      return created;
    },
  );

  // 2. Fetch moderation actions (should trigger pagination)
  const output =
    await api.functional.discussionBoard.admin.moderationActions.index(
      connection,
    );
  typia.assert(output);

  // 3. Validate pagination metadata
  TestValidator.predicate("pagination returns >= seeded moderation actions")(
    output.pagination.records >= NUM_ACTIONS,
  );
  TestValidator.predicate(
    "pagination returns more than 1 page for large dataset",
  )(output.pagination.pages > 1);

  // 4. Validate returned summaries' structure and data integrity
  const createdIds = moderationActionsCreated.map((a) => a.id);
  output.data.forEach((summary) => {
    TestValidator.predicate(
      "all summary ids exist in created moderation actions",
    )(createdIds.includes(summary.id));
    TestValidator.equals("id should be string")(typeof summary.id)(
      typeof "foo",
    );
    if (summary.actor_type !== undefined && summary.actor_type !== null)
      TestValidator.equals("actor_type is string")(typeof summary.actor_type)(
        typeof "foo",
      );
  });
}
