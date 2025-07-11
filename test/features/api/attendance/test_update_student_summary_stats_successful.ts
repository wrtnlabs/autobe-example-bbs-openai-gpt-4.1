import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 학생별 출석 통계(summary) 정보 수정 성공 플로우 검증.
 *
 * 이 테스트는 정상적으로 존재하는 학생 summary 레코드에 대해 출석/결석 횟수 또는 반/기간 정보를 수정 요청할 때
 * 실제 DB의 데이터가 정상적으로 갱신되고, 변경된 값이 바로 응답에 반영되는지 확인합니다.
 *
 * 테스트 준비를 위해 선행적으로 (1) 학교, (2) 교실, (3) 학생, (4) 학생 summary 레코드를 생성하고,
 * 그 레코드 ID 값들로 update 요청을 시행합니다. (관리자/교사 권한 가정)
 *
 * [ 절차 및 검증 항목 ]
 * 1. 학교 생성 (학교명/주소 랜덤값)
 * 2. 교실 생성 (1번 학교 PK, 교사 PK 랜덤 UUID, 클래스명/학년 랜덤)
 * 3. 학생 등록 (학교 PK, 교실 PK 활용, 기타 항목 랜덤)
 * 4. 학생 summary 최초 생성 (학생PK, 교실PK, 집계기간, 출석/결석/지각/조퇴 랜덤값)
 * 5. 4번 summary 레코드의 PK(ID)를 확보하여 일부 항목(예: 출석/결석 카운트, 교실PK, 집계기간 등 중 일부)을 변경하여 수정
 * 6. 응답 데이터에서 변경한 값이 정상적으로 반영되는지, 갱신된 summary의 각 필드값 일치 여부를 체크
 */
export async function test_api_attendance_test_update_student_summary_stats_successful(
  connection: api.IConnection,
) {
  // 1. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(10),
      address: RandomGenerator.alphabets(15),
    },
  });
  typia.assert(school);

  // 2. 교실 생성 (교사ID 임의값, ex: typia.random<string & tags.Format<"uuid">>())
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.alphabets(5),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    },
  });
  typia.assert(classroom);

  // 3. 학생 등록 (auth_account_id: 임의 UUID)
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male","female"]),
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      birthdate: new Date().toISOString(),
    },
  });
  typia.assert(student);

  // 4. 학생 summary 최초 생성
  const periodStart = "2024-03-01";
  const periodEnd = "2024-06-30";
  const origSummary = await api.functional.attendance.stats.studentSummaries.post(connection, {
    body: {
      studentId: student.id,
      classroomId: classroom.id,
      periodStart,
      periodEnd,
      totalPresent: 50,
      totalLate: 2,
      totalAbsent: 1,
      totalEarlyLeave: 0,
    },
  });
  typia.assert(origSummary);

  // 5. 데이터 일부 변경하여 summary 수정 요청
  // 예: 출석/결석/조퇴 수치/기간/반 등 중 임의 값 변경
  const newPresent = 55;
  const newAbsent = 2;
  const newClassroomId = classroom.id;
  const newPeriodEnd = "2024-07-20";
  const updateInput = {
    totalPresent: newPresent,
    totalAbsent: newAbsent,
    classroomId: newClassroomId,
    periodEnd: newPeriodEnd,
  };

  const updated = await api.functional.attendance.stats.studentSummaries.putById(connection, {
    id: origSummary.id,
    body: updateInput,
  });
  typia.assert(updated);

  // 6. 응답값 확인 (변경 필드, 수정시간 업데이트 등)
  TestValidator.equals("출석수 변경 반영")(
    updated.totalPresent
  )(newPresent);
  TestValidator.equals("결석수 변경 반영")(
    updated.totalAbsent
  )(newAbsent);
  TestValidator.equals("반 PK 변경 반영")(
    updated.classroomId
  )(newClassroomId);
  TestValidator.equals("집계 종료일 변경 반영")(
    updated.periodEnd
  )(newPeriodEnd);
  TestValidator.predicate("수정일시가 변경됨")(
    updated.updatedAt !== origSummary.updatedAt
  );
}