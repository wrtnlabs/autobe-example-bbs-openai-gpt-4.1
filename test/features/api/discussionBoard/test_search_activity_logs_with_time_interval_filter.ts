import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 활동 로그를 admin 권한으로 기간 필터별 검색하는 기능 검증
 *
 * - 관리자를 새로 생성/인증한 뒤,
 * - 다양한 action_timestamp(지난달, 경계값, 최근 1주일 등)를 가진 여러 활동 로그를 저장하고
 * - 최근 1주일 기간만 포함하는 search 요청을 보내, 반환된 로그들의 action_timestamp이 정확히 지정한 구간 내인지,
 *   pagination이 정확한지 모두 점검합니다.
 *
 * 테스트 절차
 *
 * 1. 관리자 계정 생성/권한 부여
 * 2. 액티비티 로그 6개 등록:
 *
 *    - 2개: 범위 밖 (2주 전, 10일 전)
 *    - 2개: 구간 경계값 (정확히 7일 전, 오늘)
 *    - 2개: 범위 내 (3일 전, 1일 전)
 * 3. 최근 7일 구간 검색: action_timestamp_from=7일전 0시, to=오늘(테스트 실행 시각 기준)
 * 4. 반환된 로그들의 action_timestamp이 지정 구간 내에 모두 속하는지, 범위 경계치(=from/to)에 해당하는 로그도 모두
 *    포함되는지 검증
 * 5. Pagination meta(현재/페이지 크기/전체개수/페이지수) 일관성 검증
 */
export async function test_api_discussionBoard_test_search_activity_logs_with_time_interval_filter(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 생성 및 인증 권한 획득
  const adminIdentifier = `admin-${RandomGenerator.alphaNumeric(8)}`;
  const grantNow = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminIdentifier,
        granted_at: grantNow,
        revoked_at: null,
      },
    },
  );
  typia.assert(admin);

  // 2. 테스팅용 로그: 기준일자 정의(오늘, 1일 전, 3일 전, 7일 전, 10일 전, 2주전)
  const now = new Date();
  const today = now;
  const minusDays = (days: number) => {
    const dt = new Date(now.getTime());
    dt.setDate(dt.getDate() - days);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const timestamps = [
    minusDays(14), // 범위 밖(2주 전)
    minusDays(10), // 범위 밖(10일 전)
    minusDays(7), // 경계(7일 전,시작)
    minusDays(3), // 범위 내(3일 전)
    minusDays(1), // 범위 내(1일 전)
    today, // 경계(오늘,끝)
  ];
  // 샘플 로그 데이터 생성
  const logs: IDiscussionBoardActivityLog[] = [];
  for (let i = 0; i < timestamps.length; ++i) {
    const log = await api.functional.discussionBoard.admin.activityLogs.create(
      connection,
      {
        body: {
          actor_id: admin.id,
          actor_type: "admin",
          action_type: `test_action_${i}`,
          action_timestamp: timestamps[i].toISOString(),
          // topic,thread,post,ip,user_agent,meta는 랜덤/노출되지 않음
        } satisfies IDiscussionBoardActivityLog.ICreate,
      },
    );
    typia.assert(log);
    logs.push(log);
  }
  // 3. 최근 1주일 구간: from ~ to(오늘)
  const action_timestamp_from = timestamps[2].toISOString(); // 7일 전 0시
  const action_timestamp_to = today.toISOString(); // 오늘 시각

  const searchResult =
    await api.functional.discussionBoard.admin.activityLogs.search(connection, {
      body: {
        action_timestamp_from,
        action_timestamp_to,
        // (추가필드는 기본값/미사용)
      },
    });
  typia.assert(searchResult);

  // 4. 반환된 로그: action_timestamp이 정확히 구간 내? (경계 포함)
  for (const log of searchResult.data) {
    const ts = new Date(log.action_timestamp);
    TestValidator.predicate("log action_timestamp >= action_timestamp_from")(
      ts >= new Date(action_timestamp_from),
    );
    TestValidator.predicate("log action_timestamp <= action_timestamp_to")(
      ts <= new Date(action_timestamp_to),
    );
  }
  // 5. pagination structure
  const { pagination, data } = searchResult;
  TestValidator.predicate("pagination current >= 1")(pagination.current >= 1);
  TestValidator.predicate("pagination limit >= 1")(pagination.limit >= 1);
  TestValidator.predicate("pagination records >= 0")(pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 1")(pagination.pages >= 1);
  TestValidator.predicate("data.length <= pagination.limit")(
    data.length <= pagination.limit,
  );
}
