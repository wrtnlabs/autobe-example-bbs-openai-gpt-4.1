import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 학생별 요약 통계(summary) 갱신 시 유일성 제약(동일 학생/기간)이 위반될 경우 409 오류가 응답되는지 검증
 *
 * - 테스트용 학교, 교실, 학생, summary A/B를 각각 생성
 * - summary A: (학생1, 교실1, 기간A), summary B: (학생1, 교실1, 기간B)로 먼저 준비한다
 * - 이후 summary B의 집계기간(start/end)을 summary A와 똑같이 바꿔 PUT하여 유일성 제약을 유발
 * - 이때 409 Conflict 오류가 발생하는지 TestValidator.error로 검증한다
 *
 * 1. 학교 엔티티 생성
 * 2. 동일 school에 교실 생성
 * 3. 학생 생성 (해당 학교/교실)
 * 4. 집계 기간 periodA, periodB를 준비
 * 5. summary A: (학생/교실/periodA)로 생성
 * 6. summary B: (같은 학생/교실/periodB)로 생성
 * 7. summary B에 대해, 기간/학생/교실값을 summary A와 똑같이 변경 PUT을 요청 (유일성 충돌)
 * 8. 409 Conflict 오류가 발생하는지 TestValidator.error로 검증
 */
export async function test_api_attendance_stats_studentSummaries_test_update_student_summary_stats_conflict_on_duplicate(
  connection: api.IConnection,
) {
  // 1. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: typia.random<string>(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 교실 생성 (동일 school, 임시 teacher_id)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: typia.random<string & tags.Format<'uuid'>>(),
      name: RandomGenerator.pick([
        "1-1", "2-1", "3-2", "창의융합반", "수학심화반"
      ]),
      grade_level: typia.random<number & tags.Type<'int32'>>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 3. 학생 생성 (해당 학교/교실)
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: undefined,
      auth_account_id: typia.random<string & tags.Format<'uuid'>>(),
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: typia.random<string & tags.Format<'date-time'>>(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 4. 집계 기간 A, B 준비 (서로 겹치지 않게)
  const periodA = { start: "2024-03-01", end: "2024-06-30" };
  const periodB = { start: "2024-09-01", end: "2024-12-31" };

  // 5. summary A 생성 (학생/교실/기간A)
  const summaryA = await api.functional.attendance.stats.studentSummaries.post(connection, {
    body: {
      studentId: student.id,
      classroomId: classroom.id,
      periodStart: periodA.start,
      periodEnd: periodA.end,
      totalPresent: 100,
      totalLate: 2,
      totalAbsent: 1,
      totalEarlyLeave: 0,
    } satisfies IAttendanceStatsStudentSummary.ICreate,
  });
  typia.assert(summaryA);

  // 6. summary B 생성 (같은 학생/교실/기간B)
  const summaryB = await api.functional.attendance.stats.studentSummaries.post(connection, {
    body: {
      studentId: student.id,
      classroomId: classroom.id,
      periodStart: periodB.start,
      periodEnd: periodB.end,
      totalPresent: 95,
      totalLate: 0,
      totalAbsent: 0,
      totalEarlyLeave: 0,
    } satisfies IAttendanceStatsStudentSummary.ICreate,
  });
  typia.assert(summaryB);

  // 7. summary B를 summaryA와 동일한 학생/반/기간으로 변경(유일성 위반 테스트)
  await TestValidator.error("동일 학생/기간으로 summary 중복시 409 충돌")(
    () =>
      api.functional.attendance.stats.studentSummaries.putById(connection, {
        id: summaryB.id,
        body: {
          studentId: summaryA.studentId,
          classroomId: summaryA.classroomId,
          periodStart: summaryA.periodStart,
          periodEnd: summaryA.periodEnd,
        } satisfies IAttendanceStatsStudentSummary.IUpdate,
      }),
  );
}