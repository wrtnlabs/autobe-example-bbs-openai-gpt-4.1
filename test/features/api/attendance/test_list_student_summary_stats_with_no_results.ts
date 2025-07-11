import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";
import type { IPageIAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceStatsStudentSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 존재하지 않는 학급/학생/기간 조건으로 학생 출석 통계 API 호출 시 정상 동작(빈 리스트·정상 pagination 반환/서버 에러 없음) 검증
 *
 * - 관리자/교사 권한으로 실존 학교, 교실 생성(기본 데이터)
 * - 존재하지 않는 임의 uuid와 기간 조건으로 filter 파라미터 구성
 * - /attendance/stats/studentSummaries PATCH 호출
 * - 반환값의 data 필드는 빈 배열([])이어야 하며, pagination 각 필드(current, limit, pages 등)가 number 타입으로 정상 반환되어야 함
 * - 서버 내부 에러(500 등) 없이 응답 자체가 정상구조(json)여야 함
 */
export async function test_api_attendance_test_list_student_summary_stats_with_no_results(
  connection: api.IConnection,
) {
  // 1. (존재하는) 학교 등록
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(3),
      address: RandomGenerator.paragraph()(6),
    },
  });
  typia.assert(school);

  // 2. (존재하는) 교실 등록
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.alphaNumeric(4),
      grade_level: 3,
    },
  });
  typia.assert(classroom);

  // 3. 존재하지 않는 학급ID/학생ID/기간 조건 생성
  const not_exists_classroom_id = typia.random<string & tags.Format<"uuid">>();
  const not_exists_student_id = typia.random<string & tags.Format<"uuid">>();
  const not_exists_from = "2099-01-01";
  const not_exists_to = "2099-12-31";

  // 4. 필터 조건 적용하여 학생 출석 요약 통계 API 호출
  const output = await api.functional.attendance.stats.studentSummaries.patch(
    connection,
    {
      body: {
        classroomId: not_exists_classroom_id,
        studentId: not_exists_student_id,
        fromPeriod: not_exists_from,
        toPeriod: not_exists_to,
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(output);
  TestValidator.equals("data should be empty")(output.data)([]);
  TestValidator.predicate("pagination object valid")(!!output.pagination && typeof output.pagination.current === "number" && typeof output.pagination.limit === "number" && typeof output.pagination.pages === "number");
}