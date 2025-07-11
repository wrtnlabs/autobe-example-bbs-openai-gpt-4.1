import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";
import type { IPageIAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceStatsStudentSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 출석 통계 학생 요약 리스트 조회 기능을 필터, 기간, 페이지네이션 정보를 활용해 검증합니다.
 *
 * 1. 신규 테스트용 학교를 생성한다.
 * 2. 테스트용 교사 UUID(teacher_id)를 발급(랜덤)한다.
 * 3. 해당 교사와 학교로 테스트 학급을 생성한다.
 * 4. 임시 계정 UUID(학생용 auth_account_id)도 발급한다.
 * 5. 앞서 생성한 학급, 학교, 임시 계정으로 학생을 1명 생성한다.
 * 6. 해당 학생, 학급을 대상으로 임의의 출결 학생 요약 통계 데이터를 등록한다.
 * 7. stats.studentSummaries.patch를 통해 다음 조건으로 페이징 조회를 요청한다:
 *    - classroomId: 앞서 생성한 학급 UUID
 *    - studentId: 앞서 생성한 학생 UUID
 *    - fromPeriod, toPeriod: 출결서머리 데이터 등록시의 기간 값 활용
 *    - page: 1, limit: 10
 * 8. 반환 결과가 정상적이며 페이지 메타데이터와 data 배열에 최소 1건이 포함되는지 검증한다.
 * 9. 반환된 학생 요약 개체가 요청 파라미터와 정확히 매칭되는지(클래스ID, 학생ID, 기간) 검증한다.
 * 10. page/limit/records/pages 등 페이징 정보의 논리적 일관성도 테스트한다.
 */
export async function test_api_attendance_test_list_student_summary_stats_with_valid_filters_and_pagination(connection: api.IConnection) {
  // 1. 테스트용 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(8),
      address: RandomGenerator.alphabets(16)
    }
  });
  typia.assert(school);

  // 2. 임의 teacher UUID 발급
  const teacherId = typia.random<string & tags.Format<"uuid">>();

  // 3. 테스트 학급 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherId,
      name: "1-테스트반",
      grade_level: 1 as number & tags.Type<"int32">
    }
  });
  typia.assert(classroom);

  // 4. 임의 auth_account_id 발급
  const authAccountId = typia.random<string & tags.Format<"uuid">>();

  // 5. 학생 생성
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: authAccountId,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: new Date().toISOString() as string & tags.Format<"date-time">
    }
  });
  typia.assert(student);

  // 6. 학생 요약 통계 데이터 생성
  const periodStart = "2024-07-01";
  const periodEnd = "2024-07-31";
  const summary = await api.functional.attendance.stats.studentSummaries.post(connection, {
    body: {
      studentId: student.id,
      classroomId: classroom.id,
      periodStart,
      periodEnd,
      totalPresent: 20,
      totalLate: 3,
      totalAbsent: 1,
      totalEarlyLeave: 1,
    }
  });
  typia.assert(summary);

  // 7. stats.studentSummaries.patch를 통해 필터+페이지네이션 조건으로 조회
  const result = await api.functional.attendance.stats.studentSummaries.patch(connection, {
    body: {
      classroomId: classroom.id,
      studentId: student.id,
      fromPeriod: periodStart,
      toPeriod: periodEnd,
      page: 1,
      limit: 10,
    }
  });
  typia.assert(result);

  // 8. 정상적 반환/필수 필드 확인
  TestValidator.predicate("페이징 result에 data 존재")(!!result.data && Array.isArray(result.data) && result.data.length > 0);
  TestValidator.predicate("result.pagination 존재")(!!result.pagination);

  // 9. 데이터 배열에 모든 항목이 조건과 매칭되는지 검증
  for (const s of result.data ?? []) {
    TestValidator.equals("학급ID 매칭")(s.classroomId)(classroom.id);
    TestValidator.equals("학생ID 매칭")(s.studentId)(student.id);
    TestValidator.equals("기간 시작일 매칭")(s.periodStart)(periodStart);
    TestValidator.equals("기간 종료일 매칭")(s.periodEnd)(periodEnd);
  }

  // 10. page/limit/records/pages 논리 검증
  const pagination = result.pagination!;
  TestValidator.equals("페이지 번호")(pagination.current)(1);
  TestValidator.equals("페이지 제한")(pagination.limit)(10);
  TestValidator.predicate("레코드 개수 1개 이상")(pagination.records >= 1);
  TestValidator.predicate("페이지 개수 1개 이상")(pagination.pages >= 1);
}