import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced activity log search with role and date filters for
 * moderator.
 *
 * 본 테스트는 관리자/모더레이터가 활동 로그를 actor_type(예: 'member'/'moderator') 및 시간 범위별로 고급
 * 검색(필터링)할 수 있음을 검증합니다. 또한 페이지네이션이 정상 동작하는지, 잘못된 입력/권한없는 요청/없는 역할명 등에서 예외처리가
 * 이루어지는지도 확인합니다.
 *
 * 절차:
 *
 * 1. 테스트 준비: 멤버/모더레이터 각각의 역할과 서로 다른 시각의 활동 로그 샘플 3건 생성
 * 2. Actor_type='member', 시간범위 내 로그만 필터하여 검색 → 결과에 사전 생성된 로그 포함 여부, 필터링 및 페이징 동작
 *    확인
 * 3. Limit=1로 요청시 한 페이지당 1건만 반환되는지 페이지네이션 확인
 * 4. Actor_type='moderator', 2025-07-15 하루만 범위로 필터 → 해당 role/date 로그만 반환되는지 확인
 * 5. Action_timestamp 잘못된 포맷으로 요청시 오류 반환하는지
 * 6. Authorization 없이 검색 시도시 권한 오류(접근 거부) 발생 확인
 * 7. Page=-1 또는 limit 과도(100만) 등 잘못된 값 입력시 예외 반환
 * 8. Actor_type='NOT_A_REAL_ROLE'(존재하지 않는 역할명)로 요청 시 결과 0건 반환
 */
export async function test_api_discussionBoard_test_search_activity_logs_with_role_and_date_filters(
  connection: api.IConnection,
) {
  // 1. 테스트 기본 데이터 입력: 멤버/모더레이터 각각, 서로 다른 시각에 생성
  const memberActorId = typia.random<string & tags.Format<"uuid">>();
  const moderatorActorId = typia.random<string & tags.Format<"uuid">>();

  const log1 =
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      {
        body: {
          actor_id: memberActorId,
          actor_type: "member",
          action_type: "view_post",
          action_timestamp: "2025-07-10T10:00:00.000Z",
        } satisfies IDiscussionBoardActivityLog.ICreate,
      },
    );
  typia.assert(log1);

  const log2 =
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      {
        body: {
          actor_id: moderatorActorId,
          actor_type: "moderator",
          action_type: "moderation_action",
          action_timestamp: "2025-07-15T12:00:00.000Z",
        } satisfies IDiscussionBoardActivityLog.ICreate,
      },
    );
  typia.assert(log2);

  const log3 =
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      {
        body: {
          actor_id: memberActorId,
          actor_type: "member",
          action_type: "comment_created",
          action_timestamp: "2025-07-18T15:00:00.000Z",
        } satisfies IDiscussionBoardActivityLog.ICreate,
      },
    );
  typia.assert(log3);

  // 2. 'member' 역할 & 날짜범위로 검색(로그1/3만 포함돼야)
  const memberSearch =
    await api.functional.discussionBoard.moderator.activityLogs.search(
      connection,
      {
        body: {
          actor_type: "member",
          action_timestamp_from: "2025-07-09T00:00:00.000Z",
          action_timestamp_to: "2025-07-19T23:59:59.999Z",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardActivityLog.IRequest,
      },
    );
  typia.assert(memberSearch);
  for (const log of memberSearch.data) {
    TestValidator.equals("actor_type is member")(log.actor_type)("member");
    TestValidator.predicate("timestamp in range")(
      log.action_timestamp >= "2025-07-09T00:00:00.000Z" &&
        log.action_timestamp <= "2025-07-19T23:59:59.999Z",
    );
  }
  TestValidator.predicate("contains setup logs")(
    memberSearch.data.some((x) => x.id === log1.id) &&
      memberSearch.data.some((x) => x.id === log3.id),
  );

  // 3. 페이지네이션 검증: limit=1 한정
  const paged =
    await api.functional.discussionBoard.moderator.activityLogs.search(
      connection,
      {
        body: {
          actor_type: "member",
          action_timestamp_from: "2025-07-09T00:00:00.000Z",
          action_timestamp_to: "2025-07-19T23:59:59.999Z",
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardActivityLog.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals("limit respected")(paged.data.length)(1);
  TestValidator.equals("pagination info")(paged.pagination.limit)(1);

  // 4. 'moderator' 역할, 하루 범위 필터
  const modSearch =
    await api.functional.discussionBoard.moderator.activityLogs.search(
      connection,
      {
        body: {
          actor_type: "moderator",
          action_timestamp_from: "2025-07-15T00:00:00.000Z",
          action_timestamp_to: "2025-07-15T23:59:59.999Z",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardActivityLog.IRequest,
      },
    );
  typia.assert(modSearch);
  for (const log of modSearch.data) {
    TestValidator.equals("actor_type is moderator")(log.actor_type)(
      "moderator",
    );
    TestValidator.predicate("timestamp is 2025-07-15")(
      log.action_timestamp >= "2025-07-15T00:00:00.000Z" &&
        log.action_timestamp <= "2025-07-15T23:59:59.999Z",
    );
  }
  TestValidator.predicate("contains log2")(
    modSearch.data.some((x) => x.id === log2.id),
  );

  // 5. 잘못된 날짜 포맷 입력시 예외
  await TestValidator.error("invalid date format")(() =>
    api.functional.discussionBoard.moderator.activityLogs.search(connection, {
      body: {
        actor_type: "member",
        action_timestamp_from: "2025-07-009T00:00:00",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardActivityLog.IRequest,
    }),
  );

  // 6. 권한 없는 유저(Authorization 미포함) 검색시 권한거부 예외
  const anonConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: "" },
  };
  await TestValidator.error("unauthorized search should fail")(() =>
    api.functional.discussionBoard.moderator.activityLogs.search(
      anonConnection,
      {
        body: {
          actor_type: "member",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardActivityLog.IRequest,
      },
    ),
  );

  // 7. 음수 page, 과도한 limit
  await TestValidator.error("negative page")(() =>
    api.functional.discussionBoard.moderator.activityLogs.search(connection, {
      body: {
        actor_type: "member",
        page: -1,
        limit: 10,
      } satisfies IDiscussionBoardActivityLog.IRequest,
    }),
  );
  await TestValidator.error("too large limit")(() =>
    api.functional.discussionBoard.moderator.activityLogs.search(connection, {
      body: {
        actor_type: "member",
        page: 1,
        limit: 1000000,
      } satisfies IDiscussionBoardActivityLog.IRequest,
    }),
  );

  // 8. nonsense 역할명(임의값) → 0건 반환되어야
  const nonsenseRes =
    await api.functional.discussionBoard.moderator.activityLogs.search(
      connection,
      {
        body: {
          actor_type: "NOT_A_REAL_ROLE",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardActivityLog.IRequest,
      },
    );
  typia.assert(nonsenseRes);
  TestValidator.equals("no logs for nonsense actor_type")(
    nonsenseRes.data.length,
  )(0);
}
