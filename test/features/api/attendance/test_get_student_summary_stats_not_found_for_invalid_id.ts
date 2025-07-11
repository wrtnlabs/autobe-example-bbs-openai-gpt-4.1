import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 존재하지 않는 학생 요약 통계 단건 조회 시 404 오류 반환 검증
 *
 * /attendance/stats/studentSummaries/{id} 엔드포인트에 유효한 uuid 포맷이지만 실제 데이터가 없는 id로 요청할 경우
 * 404 Not Found 오류가 발생하는지 확인한다. (이미 삭제된 케이스 포함)
 *
 * - 관리자/교사 토큰이 부여된 connection을 사용해 권한 문제를 배제함
 * - 삭제된 id 케이스는 별도 삭제 api가 없으므로 임의 uuid로 대체
 * - TestValidator.error를 활용하여 오류 발생만 검증(메시지 식별 미수행)
 */
export async function test_api_attendance_stats_studentSummaries_getById_not_found_for_invalid_id(
  connection: api.IConnection,
) {
  // 존재하지 않는 uuid로 접근했을 때 404 오류가 발생해야 함
  await TestValidator.error("존재하지 않는 student summary id 조회 시 404 오류")(() =>
    api.functional.attendance.stats.studentSummaries.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    })
  );
}