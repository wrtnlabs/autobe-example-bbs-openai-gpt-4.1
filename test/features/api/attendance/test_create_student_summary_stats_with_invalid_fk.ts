import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 잘못된 FK(존재하지 않는 학생(studentId), 학급(classroomId)) 값 입력 시 summary 생성 API의 오류 응답 검증
 *
 * - 관리자/교사 권한 토큰으로 summary 생성 시도
 * - 올바른 포맷을 가진, 존재하지 않는 UUID 값으로 FK(studentId/classroomId) 입력
 * - 정상적인 바디 구조 및 필수 필드 입력
 * - 서버에서 422(Unprocessable Entity) 또는 404(Not Found)류 오류 발생 확인
 *
 * 1. 존재하지 않는 학생 UUID(studentId)로 summary 생성 시도 → 오류 발생 여부 검증
 * 2. 존재하지 않는 학급 UUID(classroomId)로 summary 생성 시도 → 오류 발생 여부 검증
 * 3. 둘 다 잘못된 UUID로 입력 시도 → 오류 발생 여부 검증
 *
 * 필수 필드 누락, 포맷 오류 등 TypeScript 컴파일 타임 오류 발생 케이스는 제외하며,
 * FK의 존재여부에 따른 러untime 오류 상황에 집중함
 */
export async function test_api_attendance_test_create_student_summary_stats_with_invalid_fk(
  connection: api.IConnection,
) {
  // 테스트용 기본 값: 집계 기간, 합계 정보 등 ICreate 요구 필드 세트
  const commonBody = {
    periodStart: "2025-07-01",
    periodEnd: "2025-07-31",
    totalPresent: 20,
    totalLate: 3,
    totalAbsent: 2,
    totalEarlyLeave: 1,
  };

  // 1. 존재하지 않는 학생 UUID(studentId)로 summary 생성 시도
  await TestValidator.error("존재하지 않는 학생(studentId) FK 오류")(() =>
    api.functional.attendance.stats.studentSummaries.post(connection, {
      body: {
        ...commonBody,
        studentId: typia.random<string & tags.Format<"uuid">>(),
        classroomId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IAttendanceStatsStudentSummary.ICreate,
    })
  );

  // 2. 존재하지 않는 학급(classroomId) UUID로 summary 생성 시도
  await TestValidator.error("존재하지 않는 학급(classroomId) FK 오류")(() =>
    api.functional.attendance.stats.studentSummaries.post(connection, {
      body: {
        ...commonBody,
        studentId: typia.random<string & tags.Format<"uuid">>(),
        classroomId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IAttendanceStatsStudentSummary.ICreate,
    })
  );

  // 3. 학생, 학급 FK 모두 존재하지 않는 값 조합에 대해 summary 생성 시도
  await TestValidator.error("학생/학급 FK 둘 다 잘못된 경우 오류")(() =>
    api.functional.attendance.stats.studentSummaries.post(connection, {
      body: {
        ...commonBody,
        studentId: typia.random<string & tags.Format<"uuid">>(),
        classroomId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IAttendanceStatsStudentSummary.ICreate,
    })
  );
}