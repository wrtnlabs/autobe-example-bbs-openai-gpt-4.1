import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";

/**
 * 토론게시판 Engagement Stats 집계 레코드 정상 생성 테스트
 *
 * - 관리자 권한으로 discussionBoard engagement 통계를 신규 생성한다.
 * - 입력 값은 현재 월(1일~말일) 기준 realistic 사례를 적용한다 (dimension/segment 등 실사용 기준).
 * - 생성 후 반환된 id가 UUID 포맷인지, 입력 값과 반환 값이 일치하는지 검증한다.
 *
 * [검증 포인트]
 *
 * 1. Schema, business 규칙에 맞는 신규 통계가 정상 저장되는지
 * 2. 반환 데이터가 type/값/필수 필드 모두 일치하는지
 */
export async function test_api_discussionBoard_admin_engagementStats_create(
  connection: api.IConnection,
) {
  // 1. 테스트용 집계 input 데이터 준비 (이번달 1일~말일, 'site' dimension, 전체 사용자 세그먼트)
  const now = new Date();
  const period_start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const period_end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).toISOString();
  const input = {
    period_start,
    period_end,
    dimension: "site",
    segment_value: "all_users",
    post_count: 10,
    comment_count: 25,
    active_user_count: 7,
    report_count: 1,
  } satisfies IDiscussionBoardEngagementStat.ICreate;
  // 2. 집계 레코드 생성 API 호출
  const stat =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      { body: input },
    );
  typia.assert(stat);
  // 3. 반환값: schema 및 입력과 일치 검증
  TestValidator.predicate("id는 UUID 형식")(
    typeof stat.id === "string" && /^[0-9a-f\-]{36}$/.test(stat.id),
  );
  TestValidator.equals("period_start")(stat.period_start)(input.period_start);
  TestValidator.equals("period_end")(stat.period_end)(input.period_end);
  TestValidator.equals("dimension")(stat.dimension)(input.dimension);
  TestValidator.equals("segment_value")(stat.segment_value)(
    input.segment_value,
  );
  TestValidator.equals("post_count")(stat.post_count)(input.post_count);
  TestValidator.equals("comment_count")(stat.comment_count)(
    input.comment_count,
  );
  TestValidator.equals("active_user_count")(stat.active_user_count)(
    input.active_user_count,
  );
  TestValidator.equals("report_count")(stat.report_count)(input.report_count);
}
