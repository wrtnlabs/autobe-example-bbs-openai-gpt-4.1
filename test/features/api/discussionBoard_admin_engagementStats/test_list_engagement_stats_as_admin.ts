import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEngagementStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";

/**
 * 관리자 권한으로 포럼 참여 통계(Engagement Stat) 목록 조회를 검증합니다.
 *
 * - 비즈니스 목적: 관리자는 집계된 포럼 활동/참여 통계를 목록으로 조회할 수 있어야 하며, 각 레코드는 스키마 명세에 따라 모든 필드를
 *   정확히 포함해야 합니다.
 * - 페이징 동작도 필요한 경우(여러 페이지 존재 시) 정상 동작하는지 확인하는 것이 목적입니다.
 *
 * [테스트 시나리오]
 *
 * 1. 관리자가 집계 통계 레코드 2개를 사전에 생성한다.
 * 2. 목록(API GET) 호출로 전체 참여 통계(analytic stat) 리스트를 조회한다.
 * 3. 페이지네이션(pagination) 구조 및 필드 타입의 정확성 검증.
 * 4. 두 사전 생성 레코드(id 기준)가 포함되어 있는지 확인.
 * 5. 각 레코드가 스키마의 모든 필드를 올바른 타입/값으로 포함하는지 반복 체크.
 * 6. (옵션) 결과 셋이 여러 페이지에 걸치는 경우 추가 페이지 요청 동작(현재 SDK에 파라미터 미노출)도 명시적으로 남긴다.
 */
export async function test_api_discussionBoard_admin_engagementStats_index(
  connection: api.IConnection,
) {
  // 1. 관리자 권한으로 집계 통계 2개 생성
  const now = Date.now();
  const createInput1 = {
    period_start: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
    period_end: new Date(now - 1000 * 60 * 60 * 24 * 6).toISOString(),
    dimension: "role",
    segment_value: "admin",
    post_count: 10,
    comment_count: 20,
    active_user_count: 5,
    report_count: 2,
  } satisfies IDiscussionBoardEngagementStat.ICreate;
  const stat1 =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      { body: createInput1 },
    );
  typia.assert(stat1);

  const createInput2 = {
    period_start: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
    period_end: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
    dimension: "topic",
    segment_value: "general",
    post_count: 30,
    comment_count: 45,
    active_user_count: 19,
    report_count: 0,
  } satisfies IDiscussionBoardEngagementStat.ICreate;
  const stat2 =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      { body: createInput2 },
    );
  typia.assert(stat2);

  // 2. 목록(페이징) 조회
  const output =
    await api.functional.discussionBoard.admin.engagementStats.index(
      connection,
    );
  typia.assert(output);

  // 3. 페이지네이션 구조 및 타입/필드 검증
  TestValidator.predicate("pagination 객체")(
    typeof output.pagination === "object",
  );
  TestValidator.predicate("current is number")(
    typeof output.pagination.current === "number",
  );
  TestValidator.predicate("limit is number")(
    typeof output.pagination.limit === "number",
  );
  TestValidator.predicate("records is number")(
    typeof output.pagination.records === "number",
  );
  TestValidator.predicate("pages is number")(
    typeof output.pagination.pages === "number",
  );

  // 4. 두 사전 생성된 레코드들이 포함되어 있는지
  const ids = output.data.map((stat) => stat.id);
  TestValidator.predicate("created stat1 포함")(ids.includes(stat1.id));
  TestValidator.predicate("created stat2 포함")(ids.includes(stat2.id));

  // 5. 각 레코드 모든 필드 및 타입 체크
  for (const stat of output.data) {
    TestValidator.predicate("id is string")(typeof stat.id === "string");
    TestValidator.predicate("period_start is string")(
      typeof stat.period_start === "string",
    );
    TestValidator.predicate("period_end is string")(
      typeof stat.period_end === "string",
    );
    TestValidator.predicate("dimension is string")(
      typeof stat.dimension === "string",
    );
    TestValidator.predicate("segment_value is string")(
      typeof stat.segment_value === "string",
    );
    TestValidator.predicate("post_count is number")(
      typeof stat.post_count === "number",
    );
    TestValidator.predicate("comment_count is number")(
      typeof stat.comment_count === "number",
    );
    TestValidator.predicate("active_user_count is number")(
      typeof stat.active_user_count === "number",
    );
    TestValidator.predicate("report_count is number")(
      typeof stat.report_count === "number",
    );
  }

  // 6. 여러 페이지라면 추가 페이지 관련 로직(현재 SDK에는 page/limit 파라미터 없음, 명시적 코멘트)
  if (output.pagination.pages > 1) {
    // 실제 페이지 이동 API 파라미터가 없다면 테스트에서 설명으로 명시
    // ex) 만약 page/limit 파라미터 지원시, 2페이지 조회 후 output 구조/type 재확인
    // await api.functional.discussionBoard.admin.engagementStats.index(connection, { page: 2 })
    // typia.assert(nextPage);
  }
}
