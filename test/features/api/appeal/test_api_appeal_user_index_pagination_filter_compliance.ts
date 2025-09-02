import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate paginated, filtered listing of user appeals (index endpoint)
 * with user security enforcement.
 *
 * This E2E test covers the following workflow:
 *
 * 1. Registers a first user; user1 submits several appeals with distinct
 *    reasons and references.
 * 2. Registers a second user; user2 creates appeals as well (to confirm user
 *    isolation in searches).
 * 3. User1: Retrieves appeal list filtered by their own ID (appellant_id).
 *    Verifies only their appeals appear, none from user2.
 * 4. Verifies default pagination matches number of appeals, and explicit
 *    page/limit values slice the data as expected.
 * 5. Tries page/limit values outside valid range (e.g., page=0, limit=-1, page
 *    too large) and ensures empty response or correct error behavior.
 * 6. Applies filters that match no data (nonexistent status/mod action/flag)
 *    and verifies results are empty but paginated correctly, with no
 *    error.
 * 7. Confirms all returned records have appellant_id == user1.id and no other
 *    user's data appear.
 */
export async function test_api_appeal_user_index_pagination_filter_compliance(
  connection: api.IConnection,
) {
  // 1. Register user1 and login
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Name = RandomGenerator.name();
  const user1Password = "Password1!";
  const user1Join = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Name,
      password: user1Password,
      consent: true,
      display_name: user1Name,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1Join);
  const user1Id = user1Join.user.id;
  // 2. user1 submits 5 appeals
  const user1Appeals = await ArrayUtil.asyncRepeat(5, async (i) => {
    const appeal = await api.functional.discussionBoard.user.appeals.create(
      connection,
      {
        body: {
          appellant_id: user1Id,
          moderation_action_id:
            i % 2 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
          flag_report_id:
            i % 2 === 1 ? typia.random<string & tags.Format<"uuid">>() : null,
          appeal_reason: RandomGenerator.paragraph({ sentences: 5 + i }),
        } satisfies IDiscussionBoardAppeal.ICreate,
      },
    );
    typia.assert(appeal);
    return appeal;
  });
  // 3. Register user2 and login
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Name = RandomGenerator.name();
  const user2Password = "Password1!";
  const user2Join = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Name,
      password: user2Password,
      consent: true,
      display_name: user2Name,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2Join);
  const user2Id = user2Join.user.id;
  // user2 submits 2 appeals (for isolation check)
  await ArrayUtil.asyncRepeat(2, async (i) => {
    const appeal = await api.functional.discussionBoard.user.appeals.create(
      connection,
      {
        body: {
          appellant_id: user2Id,
          moderation_action_id: null,
          flag_report_id: null,
          appeal_reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardAppeal.ICreate,
      },
    );
    typia.assert(appeal);
  });
  // 4. Login as user1
  await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Name,
      password: user1Password,
      consent: true,
      display_name: user1Name,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  // 5. List user1 appeals, no filter - should only return user1's appeals
  const resDefault = await api.functional.discussionBoard.user.appeals.index(
    connection,
    {
      body: {
        appellant_id: user1Id,
      } satisfies IDiscussionBoardAppeal.IRequest,
    },
  );
  typia.assert(resDefault);
  TestValidator.equals(
    "returns only user1 appeals by default",
    resDefault.data.length,
    user1Appeals.length,
  );
  TestValidator.predicate(
    "every record has appellant_id == user1Id",
    resDefault.data.every((a) => a.appellant_id === user1Id),
  );
  // 6. Pagination: limit=2, page=2
  const resPage2 = await api.functional.discussionBoard.user.appeals.index(
    connection,
    {
      body: {
        appellant_id: user1Id,
        limit: 2,
        page: 2,
      } satisfies IDiscussionBoardAppeal.IRequest,
    },
  );
  typia.assert(resPage2);
  TestValidator.equals(
    "pagination meta page == 2",
    resPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination meta limit == 2",
    resPage2.pagination.limit,
    2,
  );
  // Ensure slice is correct
  TestValidator.equals(
    "pagination page 2 has <= 2 appeals",
    resPage2.data.length <= 2,
    true,
  );
  TestValidator.predicate(
    "every page2 record has appellant_id == user1Id",
    resPage2.data.every((a) => a.appellant_id === user1Id),
  );
  // 7. Pagination: invalid (page too high)
  const tooHighPage = Math.ceil(user1Appeals.length / 2) + 2;
  const resTooHigh = await api.functional.discussionBoard.user.appeals.index(
    connection,
    {
      body: {
        appellant_id: user1Id,
        limit: 2,
        page: tooHighPage,
      } satisfies IDiscussionBoardAppeal.IRequest,
    },
  );
  typia.assert(resTooHigh);
  TestValidator.equals(
    "empty data for page too high",
    resTooHigh.data.length,
    0,
  );
  // 8. Pagination: limit=0
  await TestValidator.error("limit 0 should fail", async () => {
    await api.functional.discussionBoard.user.appeals.index(connection, {
      body: {
        appellant_id: user1Id,
        limit: 0,
        page: 1,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  });
  // 9. Pagination: negative page
  await TestValidator.error("negative page should fail", async () => {
    await api.functional.discussionBoard.user.appeals.index(connection, {
      body: {
        appellant_id: user1Id,
        limit: 2,
        page: -1,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  });
  // 10. Filters that match no appeals
  const resNoMatch = await api.functional.discussionBoard.user.appeals.index(
    connection,
    {
      body: {
        appellant_id: user1Id,
        status: "nonexistent-status-string",
      } satisfies IDiscussionBoardAppeal.IRequest,
    },
  );
  typia.assert(resNoMatch);
  TestValidator.equals(
    "empty search result for unmatched status",
    resNoMatch.data.length,
    0,
  );
  // Ensure pagination meta is still valid
  TestValidator.predicate(
    "pagination current == 1 for empty query",
    resNoMatch.pagination.current === 1,
  );
}
