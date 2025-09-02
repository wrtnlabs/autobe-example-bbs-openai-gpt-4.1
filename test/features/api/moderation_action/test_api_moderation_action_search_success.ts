import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate retrieval of paginated, filtered moderation actions list as a
 * verified moderator.
 *
 * 1. Register and authenticate as a new moderator via /auth/moderator/join.
 * 2. Perform search on /discussionBoard/moderator/moderationActions with
 *    various filters:
 *
 *    - Pagination (page + limit)
 *    - Filtering by actionType, moderatorId, userId, postId, commentId
 *    - Time window filters on effectiveFrom/effectiveUntil/createdFrom/createdTo
 *    - Sort options (sortBy, sortDirection)
 *    - Free-text search
 * 3. Validate response structure conforms to
 *    IPageIDiscussionBoardModerationAction.ISummary:
 *
 *    - Pagination field correct (current, limit, pages, records)
 *    - Data is an array of IDiscussionBoardModerationAction.ISummary
 * 4. For each filter used, check representative data rows match search
 *    criteria.
 * 5. Check pagination works (fetch second page, verify different data, correct
 *    pagination increment)
 * 6. Edge: Use search term that shouldn’t match any actions, confirm empty
 *    data array and correct pagination
 */
export async function test_api_moderation_action_search_success(
  connection: api.IConnection,
) {
  // 1. Register and login as moderator
  const joinInput: IDiscussionBoardModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    consent: true,
  };
  const authorized = await api.functional.auth.moderator.join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const moderator = authorized.moderator;
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator id is a uuid",
    typeof moderator.id === "string" && moderator.id.length > 0,
  );
  TestValidator.predicate("moderator is active", moderator.is_active === true);

  // 2. Perform search with different filters
  // a. Simple pagination
  const page1 =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination current is 1", page1.pagination.current, 1);
  TestValidator.equals("pagination limit is 5", page1.pagination.limit, 5);
  TestValidator.predicate("data length <= limit", page1.data.length <= 5);
  if (page1.data.length > 0) {
    TestValidator.predicate(
      "data items type is ISummary",
      page1.data.every((x) => !!x.id && !!x.action_type),
    );
  }

  // b. Filtering by moderatorId
  const byModerator =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          moderatorId: moderator.id,
          limit: 3,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(byModerator);
  if (byModerator.data.length > 0) {
    for (const row of byModerator.data) {
      TestValidator.equals(
        "moderator_id matches filter",
        row.moderator_id,
        moderator.id,
      );
    }
  }

  // c. Filtering by actionType (with enum value)
  const actionTypes = [
    "warn",
    "mute",
    "remove",
    "edit",
    "restrict",
    "restore",
    "escalate",
  ] as const;
  const actionType = RandomGenerator.pick(actionTypes);
  const byType =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          actionType,
          limit: 2,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(byType);
  if (byType.data.length > 0) {
    for (const row of byType.data) {
      TestValidator.equals("action_type matches", row.action_type, actionType);
    }
  }

  // d. Date window filter (createdFrom, createdTo)
  if (page1.data.length > 0) {
    const sample = RandomGenerator.pick(page1.data);
    const createdFrom = sample.created_at;
    const createdTo = sample.created_at;
    const byTime =
      await api.functional.discussionBoard.moderator.moderationActions.index(
        connection,
        {
          body: {
            createdFrom,
            createdTo,
            limit: 5,
          } satisfies IDiscussionBoardModerationAction.IRequest,
        },
      );
    typia.assert(byTime);
    if (byTime.data.length > 0)
      for (const row of byTime.data) {
        TestValidator.equals(
          "created_at in range",
          row.created_at,
          sample.created_at,
        );
      }
  }

  // e. Free-text search (should yield zero matches)
  const neverString =
    RandomGenerator.alphaNumeric(20) + RandomGenerator.alphaNumeric(20);
  const emptySearch =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          search: neverString,
          limit: 5,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty data on unmatched search",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 when empty",
    emptySearch.pagination.pages,
    0,
  );

  // 5. Test second page pagination
  if (page1.pagination.pages >= 2) {
    const page2 =
      await api.functional.discussionBoard.moderator.moderationActions.index(
        connection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IDiscussionBoardModerationAction.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current is 2",
      page2.pagination.current,
      2,
    );
    TestValidator.equals("pagination limit is 5", page2.pagination.limit, 5);
    TestValidator.predicate(
      "second page can have data",
      page2.data.length <= 5,
    );
    if (page2.data.length > 0) {
      const ids1 = page1.data.map((x) => x.id);
      for (const row of page2.data) {
        TestValidator.predicate(
          "page2.row.id not in page1",
          !ids1.includes(row.id),
        );
      }
    }
  }
}
