import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEngagementStat";

/**
 * 관리자가 기존 engagement stat을 ID로 상세 조회하는 정상 경로를 검증합니다.
 *
 * 이 테스트는 다음을 보장합니다:
 *
 * - 관리자가 engagement stat 레코드를 신규 생성한 후, 해당 ID로 상세 조회가 정상적으로 동작하는지 검증
 * - 조회 결과가 생성 입력 데이터와 모든 필드에서 완전히 일치하는지 검증(데이터 완전성)
 *
 * [시나리오]
 *
 * 1. 관리자가 engagement stat을 생성한다
 * 2. 방금 생성한 레코드의 id로 상세조회 API를 호출한다
 * 3. 반환된 데이터가 생성 시점의 원본과 필드별로 정확히 일치함을 검사한다(필드별 equals)
 *
 * 이 테스트는 관리자 통계 상세 조회 API의 해피패스 및 데이터 일관성 보장을 검증합니다.
 */
export async function test_api_discussionBoard_admin_engagementStats_at(
  connection: api.IConnection,
) {
  // 1. 관리자가 engagement stat 레코드를 생성한다
  const request: IDiscussionBoardEngagementStat.ICreate = {
    topic_id: typia.random<string & tags.Format<"uuid">>(),
    period_start: typia.random<string & tags.Format<"date-time">>(),
    period_end: typia.random<string & tags.Format<"date-time">>(),
    dimension: "site",
    segment_value: "admin",
    post_count: typia.random<number & tags.Type<"int32">>(),
    comment_count: typia.random<number & tags.Type<"int32">>(),
    active_user_count: typia.random<number & tags.Type<"int32">>(),
    report_count: typia.random<number & tags.Type<"int32">>(),
  };
  const created: IDiscussionBoardEngagementStat =
    await api.functional.discussionBoard.admin.engagementStats.create(
      connection,
      { body: request },
    );
  typia.assert(created);

  // 2. 생성된 id로 상세 조회
  const detail: IDiscussionBoardEngagementStat =
    await api.functional.discussionBoard.admin.engagementStats.at(connection, {
      engagementStatId: created.id,
    });
  typia.assert(detail);

  // 3. 필드별로 원본과 일치하는지 모두 검증
  TestValidator.equals("engagementStat.id")(detail.id)(created.id);
  TestValidator.equals("topic_id")(detail.topic_id)(created.topic_id);
  TestValidator.equals("period_start")(detail.period_start)(
    created.period_start,
  );
  TestValidator.equals("period_end")(detail.period_end)(created.period_end);
  TestValidator.equals("dimension")(detail.dimension)(created.dimension);
  TestValidator.equals("segment_value")(detail.segment_value)(
    created.segment_value,
  );
  TestValidator.equals("post_count")(detail.post_count)(created.post_count);
  TestValidator.equals("comment_count")(detail.comment_count)(
    created.comment_count,
  );
  TestValidator.equals("active_user_count")(detail.active_user_count)(
    created.active_user_count,
  );
  TestValidator.equals("report_count")(detail.report_count)(
    created.report_count,
  );
}
