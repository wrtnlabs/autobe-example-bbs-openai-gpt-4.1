import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 학생 출석집계(summary) 레코드 삭제 성공 케이스 검증.
 *
 * 1. 테스트용 학교(IAttendanceSchool)를 생성한다.
 * 2. 담당 교사 UUID(teacherId)를 생성한다. (단순 uuid 베이스)
 * 3. 교실(IAttendanceClassroom)을 생성한다. (학교에 소속 & teacherId 사용)
 * 4. 학생용 인증계정 UUID(authAccountId)를 생성한다. (단순 uuid)
 * 5. 학생(IAttendanceStudent)을 생성한다. (소속 학교/교실/인증계정 id 사용)
 * 6. 학생 summary 집계(IAttendanceStatsStudentSummary)를 생성한다. (학생/교실 id 및 집계 수치 직접 지정)
 * 7. 생성된 summary id로 DELETE /attendance/stats/studentSummaries/{id} 호출 → 정상 삭제 및 204 응답 확인
 * 8. 삭제된 summary id로 다시 조회시 404 not found 응답 검증 (재조회는 공식 API 미제공되어 생략)
 */
export async function test_api_attendance_test_delete_student_summary_stats_successful(
  connection: api.IConnection,
) {
  // 1. 테스트용 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphaNumeric(8),
      address: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 교사 UUID 생성
  const teacherId = typia.random<string & tags.Format<"uuid">>();

  // 3. 교실 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherId,
      name: RandomGenerator.alphaNumeric(4),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 4. 학생 인증계정 UUID 생성
  const authAccountId = typia.random<string & tags.Format<"uuid">>();

  // 5. 학생 생성
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: authAccountId,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: new Date().toISOString(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 6. summary 생성
  const summary = await api.functional.attendance.stats.studentSummaries.post(connection, {
    body: {
      studentId: student.id,
      classroomId: classroom.id,
      periodStart: "2024-03-01",
      periodEnd: "2024-08-20",
      totalPresent: 90,
      totalLate: 4,
      totalAbsent: 2,
      totalEarlyLeave: 1,
    } satisfies IAttendanceStatsStudentSummary.ICreate,
  });
  typia.assert(summary);

  // 7. 해당 summary id로 DELETE 호출 → 204 응답
  await api.functional.attendance.stats.studentSummaries.eraseById(connection, {
    id: summary.id,
  });

  // 8. 재조회 API 미제공되어 skip
}