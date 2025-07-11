import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 학생 요약 통계 상세조회(GET) 정상 케이스 E2E 테스트
 *
 * 이 테스트는 /attendance/stats/studentSummaries/{id} 엔드포인트의 상세조회를 검증한다.
 * 주요 목적은 FK 연결 및 주요 필드(학생ID, 기간, 교실ID, 출결합계 등) 반환이 입력값과 일치하는지 확인함. 실제 관리자/교사 권한 토큰 하에서 수행됨. 시나리오 내에서는 타인 소유 접근불가 정책 오류 확인은 제외(별도 case 필요).
 *
 * [테스트 프로세스]
 * 1. 신규 학교 생성(임의 name/address)
 * 2. 해당 학교 소속 교실 생성(teacher_id 임의 UUID, grade_level/name 랜덤)
 * 3. 해당 school/classroom 내 학생 생성(auth_account_id 임의 UUID 등)
 * 4. summary 생성: studentId, classroomId, 임의 기간, 합계값 등 생성
 * 5. summary 상세조회: id로 getById 호출, 생성시 입력 정보와 응답 주요 필드 일치 검증
 */
export async function test_api_attendance_test_get_student_summary_stats_successful_with_valid_id(
  connection: api.IConnection,
) {
  // 1. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `테스트학교_${RandomGenerator.alphabets(8)}`,
      address: `서울시 강남구 테스트로 ${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>>()}`,
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 교실 생성
  const teacherId = typia.random<string & tags.Format<"uuid">>();
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherId,
      name: `1학년${RandomGenerator.alphaNumeric(2)}`,
      grade_level: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<6>>()
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);
  TestValidator.equals("school 연결 확인")(classroom.school_id)(school.id);

  // 3. 학생 생성
  const authAccountId = typia.random<string & tags.Format<"uuid">>();
  const gender: "male" | "female" = RandomGenerator.pick<"male" | "female">(["male", "female"]);
  const birthdate: string & tags.Format<"date-time"> = new Date(2013, 2, 15).toISOString() as string & tags.Format<"date-time">;
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: authAccountId,
      name: `홍길동_${RandomGenerator.alphaNumeric(5)}`,
      gender: gender,
      birthdate: birthdate,
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);
  TestValidator.equals("school 연결 확인")(student.school_id)(school.id);
  TestValidator.equals("classroom 연결 확인")(student.classroom_id)(classroom.id);

  // 4. summary 생성
  const summaryPeriodStart = "2025-03-01";
  const summaryPeriodEnd = "2026-02-28";
  const totalPresent = typia.random<number & tags.Type<"int32">>();
  const totalLate = typia.random<number & tags.Type<"int32">>();
  const totalAbsent = typia.random<number & tags.Type<"int32">>();
  const totalEarlyLeave = typia.random<number & tags.Type<"int32">>();

  const summary = await api.functional.attendance.stats.studentSummaries.post(connection, {
    body: {
      studentId: student.id,
      classroomId: classroom.id,
      periodStart: summaryPeriodStart,
      periodEnd: summaryPeriodEnd,
      totalPresent,
      totalLate,
      totalAbsent,
      totalEarlyLeave,
    } satisfies IAttendanceStatsStudentSummary.ICreate,
  });
  typia.assert(summary);
  TestValidator.equals("student 연결 확인")(summary.studentId)(student.id);
  TestValidator.equals("classroom 연결 확인")(summary.classroomId)(classroom.id);

  // 5. 요약통계 상세조회
  const read = await api.functional.attendance.stats.studentSummaries.getById(connection, {
    id: summary.id,
  });
  typia.assert(read);
  // 필드 일치 검증
  TestValidator.equals("학생ID 일치")(read.studentId)(summary.studentId);
  TestValidator.equals("교실ID 일치")(read.classroomId)(summary.classroomId);
  TestValidator.equals("기간 시작일자 일치")(read.periodStart)(summary.periodStart);
  TestValidator.equals("기간 종료일자 일치")(read.periodEnd)(summary.periodEnd);
  TestValidator.equals("출석합계 일치")(read.totalPresent)(summary.totalPresent);
  TestValidator.equals("지각합계 일치")(read.totalLate)(summary.totalLate);
  TestValidator.equals("결석합계 일치")(read.totalAbsent)(summary.totalAbsent);
  TestValidator.equals("조퇴합계 일치")(read.totalEarlyLeave)(summary.totalEarlyLeave);
}