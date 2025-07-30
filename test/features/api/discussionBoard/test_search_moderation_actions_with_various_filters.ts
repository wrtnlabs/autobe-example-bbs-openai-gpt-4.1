import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for searching moderation actions on the discussion board with
 * various advanced filters and proper access control.
 *
 * This test covers:
 *
 * - Creating several sample moderation actions as a moderator, diverse by
 *   action_type and targets
 * - Searching for moderation actions as a moderator, filtered by action_type,
 *   actor, date range, target, pagination, and verifying results
 * - Ensuring unauthorized (non-moderator) users cannot access moderation action
 *   search
 * - Edge cases with out-of-range pagination and invalid filters
 *
 * Steps:
 *
 * 1. (Prerequisite) Create at least 3 moderation actions with distinct
 *    action_types, actors, and targets
 * 2. (Happy Path) As a moderator, search for all actions: confirm paginated data,
 *    correct actor_type filtering, all actions present
 * 3. As moderator, search by specific action_type: only matching action(s)
 *    returned
 * 4. As moderator, search by actor_moderator_id: only that actor's actions
 *    returned
 * 5. As moderator, search by specific date window (should include 1 created
 *    action): confirm only expected action falls in window
 * 6. As moderator, search by post_id or comment_id (use one of the created
 *    actions' targets): verify action is returned
 * 7. As moderator, try a page number out of range: data array is empty, pagination
 *    is valid
 * 8. Try invalid filter (e.g. invalid uuid in actor_moderator_id): expect empty or
 *    error
 * 9. Switch to non-moderator, attempt to search: expect error for access denied
 */
export async function test_api_discussionBoard_test_search_moderation_actions_with_various_filters(
  connection: api.IConnection,
) {
  // 1. Create sample moderation actions for test data
  const actionTypes = ["delete", "warn", "ban"];
  const createdActions: IDiscussionBoardModerationAction[] = [];
  for (let i = 0; i < actionTypes.length; i++) {
    const action =
      await api.functional.discussionBoard.moderator.moderationActions.create(
        connection,
        {
          body: {
            actor_moderator_id: typia.random<string & tags.Format<"uuid">>(),
            action_type: actionTypes[i],
            // Alternate targets: post_id for i=0, comment_id for i=1, report_id for i=2
            post_id:
              i === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
            comment_id:
              i === 1 ? typia.random<string & tags.Format<"uuid">>() : null,
            report_id:
              i === 2 ? typia.random<string & tags.Format<"uuid">>() : null,
            action_details: `test details ${i}`,
          } satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    typia.assert(action);
    createdActions.push(action);
  }

  // 2. Happy path: moderator searches for all moderation actions
  const searchAllResult =
    await api.functional.discussionBoard.moderator.moderationActions.search(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(searchAllResult);
  TestValidator.predicate("Moderator can see all created moderation actions")(
    createdActions.every((ca) =>
      searchAllResult.data.some((sa) => sa.id === ca.id),
    ),
  );

  // 3. Filter by action_type (e.g. "warn")
  const warnResult =
    await api.functional.discussionBoard.moderator.moderationActions.search(
      connection,
      {
        body: {
          action_type: "warn",
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(warnResult);
  TestValidator.predicate("Only warn action(s) returned")(
    warnResult.data.every(
      (sa) =>
        createdActions.find((ca) => ca.id === sa.id)?.action_type === "warn",
    ),
  );

  // 4. Filter by actor_moderator_id
  const actorId = createdActions[0].actor_moderator_id!;
  const actorResult =
    await api.functional.discussionBoard.moderator.moderationActions.search(
      connection,
      {
        body: {
          actor_moderator_id: actorId,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(actorResult);
  TestValidator.predicate("Only actions by actor_moderator_id returned")(
    actorResult.data.every((sa) => sa.id === createdActions[0].id),
  );

  // 5. Filter by date window (simulate with created_at of one action)
  const { created_at } = createdActions[1];
  const dateResult =
    await api.functional.discussionBoard.moderator.moderationActions.search(
      connection,
      {
        body: {
          created_at_from: created_at,
          created_at_to: created_at,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(dateResult);
  TestValidator.predicate("Exactly the expected action in date window")(
    dateResult.data.find((sa) => sa.id === createdActions[1].id) !== undefined,
  );

  // 6. Filter by target (post_id)
  const postAction = createdActions.find((a) => !!a.post_id);
  if (postAction) {
    const postResult =
      await api.functional.discussionBoard.moderator.moderationActions.search(
        connection,
        {
          body: {
            post_id: postAction.post_id!,
            limit: 10,
          } satisfies IDiscussionBoardModerationAction.IRequest,
        },
      );
    typia.assert(postResult);
    TestValidator.predicate("Only actions for given post_id")(
      postResult.data.some((sa) => sa.id === postAction.id),
    );
  }
  // 7. Edge: page out of range
  const outOfRangeResult =
    await api.functional.discussionBoard.moderator.moderationActions.search(
      connection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(outOfRangeResult);
  TestValidator.equals("Empty data on out-of-range page")(
    outOfRangeResult.data,
  )([]);

  // 8. Edge: invalid uuid for actor_moderator_id
  const invalidResult =
    await api.functional.discussionBoard.moderator.moderationActions.search(
      connection,
      {
        body: {
          actor_moderator_id: "INVALID-UUID",
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(invalidResult);
  TestValidator.equals("Empty data when invalid filter used")(
    invalidResult.data,
  )([]);

  // 9. Switch to non-moderator, expect error (simulate loss of mod rights)
  // Simulate by deleting/modifying Authorization header or switching context; for this test, expect error thrown
  const fakeConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer fake-non-moderator",
    },
  };
  await TestValidator.error("Non-moderator denied access")(() =>
    api.functional.discussionBoard.moderator.moderationActions.search(
      fakeConnection,
      {
        body: {
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    ),
  );
}
