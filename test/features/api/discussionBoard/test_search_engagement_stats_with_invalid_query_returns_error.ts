import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";
import type { IPageIDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEngagementStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자 Engagement 통계 API 잘못된 쿼리 파라미터 오류 검증
 *
 * 대시보드/분석용 Engagement 통계 API에서 잘못된 쿼리 바디(파싱 불가, 논리적 오류, impossible segment, 타입
 * mismatch 등) 를 입력했을 때 시스템이 명확한 validation error를 반환하며, 데이터나 정보 유출 없이 끝나는지
 * 검증한다.
 *
 * [진행 단계 및 검증 포인트]
 *
 * 1. 파싱 불가/형식 오류 (malformed date-time: period_start_from: "not-a-date") → Error 반환
 *    검증
 * 2. 과도한 limit (예: limit: 1_000_000) → Error 반환 검증
 * 3. 불가능한 segment_value (예: dimension="role",
 *    segment_value="never-exist-segment-value") → Error 반환 검증
 * 4. 타입 불일치 입력 (예: page: "wrong-type") → Error 반환 검증 → 어떤 케이스도 데이터가 유출되거나 예상밖 반환
 *    없이, 항상 명확한 오류만 발생하는지 체크
 */
export async function test_api_discussionBoard_test_search_engagement_stats_with_invalid_query_returns_error(
  connection: api.IConnection,
) {
  // 1. Malformed Date-Time (period_start_from)
  await TestValidator.error("malformed date-time")(() =>
    api.functional.discussionBoard.admin.engagementStats.search(connection, {
      body: {
        period_start_from: "not-a-date",
        limit: 10,
      },
    }),
  );

  // 2. Excessively Large Limit (limit overflow)
  await TestValidator.error("limit overflow")(() =>
    api.functional.discussionBoard.admin.engagementStats.search(connection, {
      body: {
        period_start_from: new Date().toISOString(),
        period_end_to: new Date().toISOString(),
        limit: 1_000_000,
      },
    }),
  );

  // 3. Impossible Segment Value
  await TestValidator.error("impossible segment_value")(() =>
    api.functional.discussionBoard.admin.engagementStats.search(connection, {
      body: {
        dimension: "role",
        segment_value: "never-exist-segment-value",
        limit: 10,
      },
    }),
  );

  // 4. Invalid Type in Page Field
  await TestValidator.error("wrong type for page field")(() =>
    api.functional.discussionBoard.admin.engagementStats.search(connection, {
      body: {
        // TypeScript에서 명확한 타입 미스매치는 컴파일 타임에서 에러지만,
        // 런타임 구조상 any로 강제 주입하여 유효성 검증 실시
        page: "wrong-type" as any,
        limit: 10,
      },
    }),
  );
}
