import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 동일 학생, 동일 기간(period_start~period_end)으로 summary 레코드 중복 생성 방지 검사
 *
 * 이 테스트는 특정 학생에 대해, 동일한 집계기간(periodStart~periodEnd)으로 요약 통계 summary 레코드가 이미 존재하는 상태에서 다시 동일한 요청을 보낼 경우 서비스가 유일성 제약 위반(예: 409 Conflict) 등의 에러로 처리되는지 검증한다.
 *
 * 1. 출석 통계 대상 학교 등록
 * 2. 출석 통계 대상 교실 등록
 * 3. 출석 통계 대상 학생 생성
 * 4. 특정 기간(summary) 레코드 신규 생성
 * 5. 위와 동일한 요약(summary) 정보로 다시 중복 생성 시도 → 에러(409 등) 발생 확인
 */
export async function test_api_attendance_test_create_student_summary_stats_with_duplicate_student_and_period(
  connection: api.IConnection,
) {
  // 1. 출석 통계 대상 학교 등록
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(10),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 출석 통계 대상 교실 등록
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.alphabets(6),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 3. 출석 통계 대상 학생 생성
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: new Date("2011-03-03").toISOString(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 4. 집계 기간/학생 정보로 summary 레코드 생성
  const summaryInput: IAttendanceStatsStudentSummary.ICreate = {
    studentId: student.id,
    classroomId: classroom.id,
    periodStart: "2024-03-01",
    periodEnd: "2024-03-31",
    totalPresent: 21,
    totalLate: 2,
    totalAbsent: 1,
    totalEarlyLeave: 0,
  };
  const summary = await api.functional.attendance.stats.studentSummaries.post(
    connection,
    {
      body: summaryInput,
    },
  );
  typia.assert(summary);

  // 5. 동일한 값으로 다시 summary 생성 시도 → 유일성 위반(409 등) 에러 확인
  await TestValidator.error("중복 summary 생성시 409 또는 유일성 오류")(
    () =>
      api.functional.attendance.stats.studentSummaries.post(connection, {
        body: summaryInput,
      })
  );
}