import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";
import type { IPageAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceAttendanceCode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 출석 코드 목록 조회(검색) - 결과가 비어있는 경우 처리 검증
 *
 * 출석 코드 데이터가 일부 등록되어 있지만, 존재하지 않는 teacher_id 또는 유효기간(만료일) 기준 등 명확히 조건에 맞지 않는 필터(teacher_id, expires_to 등)로 조회를 요청할 때,
 * data 배열이 빈([]) 상태로, pagination의 records=0, pages=0임을 체크한다.
 *
 * - 필수: 사전에 실제 출석코드 데이터가 있으나(매칭 불가하도록 등록), 빈 조건 조회시 페이징, 리스트가 올바른지 검증
 *
 * 1. 출석 코드 검색 권한을 가진 테스트 계정 생성 (attendance_auth_account)
 * 2. 테스트용 학교 데이터 생성 (attendance_school)
 * 3. 정상적인 교실(반) 데이터 1개 이상 등록(교사, 학교 참조)
 * 4. 실제 출석 코드도 1개 이상 등록(교실, 교사)에 연결 (단, 검색에 잡히지 않게 등록)
 * 5. 없는 teacher_id, 또는 유효기간 범위로 코드 목록 조회 (patch)
 * 6. data가 [] 이고, pagination.records=0, pages=0 등 페이징 메타가 올바른지 assert
 */
export async function test_api_attendance_test_list_attendance_codes_with_no_results(
  connection: api.IConnection,
) {
  // 1. 출석 코드 검색 권한을 가진 테스트 계정 생성
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 2. 테스트용 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 교실(반) 생성 (해당 account를 teacher_id로 지정)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: account.id,
      name: RandomGenerator.alphaNumeric(5),
      grade_level: 1,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 4. 실제 출석코드 1개 이상 등록(조회조건과 확실하게 불일치하도록 등록)
  const attendanceCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroom.id,
      teacher_id: account.id,
      code_value: RandomGenerator.alphaNumeric(6),
      issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
      is_active: true,
    } satisfies IAttendanceAttendanceCode.ICreate,
  });
  typia.assert(attendanceCode);

  // 5. 존재하지 않는 teacher_id로 조회(확실히 없는 조건)
  const notFoundTeacherId = typia.random<string & tags.Format<"uuid">>();
  const pageResult1 = await api.functional.attendance.attendanceCodes.patch(connection, {
    body: {
      teacher_id: notFoundTeacherId,
      page: 1,
      limit: 10,
    } satisfies IAttendanceAttendanceCode.IRequest,
  });
  typia.assert(pageResult1);
  TestValidator.equals("빈 결과(teacher_id)")(pageResult1.data)([]);
  TestValidator.equals("pagination.records=0")(pageResult1.pagination.records)(0);
  TestValidator.equals("pagination.pages=0")(pageResult1.pagination.pages)(0);

  // 6. 충분히 과거의 만료일 구간 필터(등록된 데이터와 겹치지 않게)
  const pageResult2 = await api.functional.attendance.attendanceCodes.patch(connection, {
    body: {
      expires_to: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      page: 1,
      limit: 10,
    } satisfies IAttendanceAttendanceCode.IRequest,
  });
  typia.assert(pageResult2);
  TestValidator.equals("빈 결과(만료일 범위)")(pageResult2.data)([]);
  TestValidator.equals("pagination.records=0")(pageResult2.pagination.records)(0);
  TestValidator.equals("pagination.pages=0")(pageResult2.pagination.pages)(0);
}