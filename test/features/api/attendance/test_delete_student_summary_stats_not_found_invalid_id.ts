import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * 존재하지 않거나 잘못된 ID 값으로 학생 summary 통계 삭제를 시도하는 경우 404 에러 반환을 검증합니다.
 *
 * - 관리자/교사 권한 토큰으로 요청합니다 (테스트 connection이 이미 권한 있다고 간주)
 * - 실제로 존재하지 않는 UUID 형식의 ID를 사용해 삭제 요청을 보냅니다.
 * - 404 NOT FOUND 에러가 반환되는지를 확인합니다.
 *
 * [시험 시나리오]
 * 1. 임의의 UUID(존재하지 않는 summary id)를 생성하여 삭제 요청
 * 2. 404 에러 반환되는지 확인
 */
export async function test_api_attendance_test_delete_student_summary_stats_not_found_invalid_id(
  connection: api.IConnection,
) {
  // 1. 실존하지 않는 ID(uuid)로 삭제 요청 → 반드시 404 error 발생해야 함
  await TestValidator.error("존재하지 않는 summary id로 삭제 시 404 반환됨")(
    async () => {
      await api.functional.attendance.stats.studentSummaries.eraseById(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>() as string & tags.Format<"uuid">,
        },
      );
    },
  );
}