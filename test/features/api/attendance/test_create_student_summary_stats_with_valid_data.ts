import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 학생 요약 통계(summary) 생성 E2E 테스트
 *
 * 출석관리 시스템에서 학생별·기간별 통계 summary를 정상적으로 생성하고,
 * FK 유효성 및 유일성 제약(동일 학생·기간 중복 금지)를 검증한다.
 *
 * 1. 학교, 교실, 학생 등 연관 엔티티 모두 선행 생성
 * 2. 위 학생/교실, 임의의 기간 및 합계 정보로 summary 생성
 * 3. 반환 summary 객체 값 및 필드 검증
 * 4. 동일 학생/기간 조건으로 summary 중복 생성 시도 → 에러 발생 확인
 */
export async function test_api_attendance_test_create_student_summary_stats_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 테스트용 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(10) + "초등학교",
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 테스트용 교실(반) 생성 - 랜덤 교사 UUID 사용
  const teacherId = typia.random<string & tags.Format<"uuid">>();
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherId,
      name: RandomGenerator.alphabets(2) + "반",
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 3. 테스트용 학생 생성 - 학생 계정ID/보호자FK 랜덤
  const authAccountId = typia.random<string & tags.Format<"uuid">>();
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: authAccountId,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 10).toISOString(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 4. summary 집계 생성: 기간, 합계 모두 랜덤(범위 내)
  const periodStart = "2025-03-01"; // YYYY-MM-DD 문자열 (테스트 고정값)
  const periodEnd = "2025-07-31";
  const createSummary = {
    studentId: student.id,
    classroomId: classroom.id,
    periodStart,
    periodEnd,
    totalPresent: 85,
    totalLate: 2,
    totalAbsent: 1,
    totalEarlyLeave: 0,
  } satisfies IAttendanceStatsStudentSummary.ICreate;

  const summary = await api.functional.attendance.stats.studentSummaries.post(
    connection,
    { body: createSummary },
  );
  typia.assert(summary);
  // 반환 필드 검증
  TestValidator.equals("학생PK 일치")(summary.studentId)(student.id);
  TestValidator.equals("교실PK 일치")(summary.classroomId)(classroom.id);
  TestValidator.equals("집계기간 일치")(summary.periodStart)(periodStart);
  TestValidator.equals("집계기간 일치")(summary.periodEnd)(periodEnd);
  TestValidator.equals("출석합계 일치")(summary.totalPresent)(createSummary.totalPresent);
  TestValidator.equals("지각합계 일치")(summary.totalLate)(createSummary.totalLate);
  TestValidator.equals("결석합계 일치")(summary.totalAbsent)(createSummary.totalAbsent);
  TestValidator.equals("조퇴합계 일치")(summary.totalEarlyLeave)(createSummary.totalEarlyLeave);

  // 5. 동일 학생/기간 조건으로 summary 중복 생성 시도 → 유일성 위배 에러 발생 확인
  await TestValidator.error("동일 학생·기간 집계 중복 불가")(() =>
    api.functional.attendance.stats.studentSummaries.post(connection, {
      body: createSummary,
    })
  );
}