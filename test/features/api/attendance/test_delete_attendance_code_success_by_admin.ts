import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 출석 코드 삭제 기능(관리자/교사) 정상 동작을 검증합니다.
 *
 * 본 테스트는 출석 코드 삭제 기능이 관리자 또는 교사 계정에서 정상적으로 동작하는지 확인하기 위한 시나리오입니다.
 * 출석 코드가 삭제(혹은 비활성화)되고, 적합한 성공 응답(204 등)이 반환되는지 검증합니다.
 *
 * 전체 테스트 흐름:
 * 1. 관리자/교사 계정 생성 및 인증이 필요합니다.
 * 2. 테스트용 학교 데이터를 생성합니다.
 * 3. 해당 학교에 소속된 반(클래스)을 생성합니다.
 * 4. 방금 생성한 반, 교사 정보를 바탕으로 출석 코드를 생성합니다.
 * 5. 생성된 출석 코드의 id로 삭제 요청(DELETE) 호출
 * 6. (옵션) 삭제 후 코드 관련 추가 탐색은 DELETE가 204 반환에 집중하여 생략
 */
export async function test_api_attendance_test_delete_attendance_code_success_by_admin(
  connection: api.IConnection,
) {
  // 1. 관리자/교사 계정 생성
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // 2. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(10),
      address: RandomGenerator.alphabets(15),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 반(클래스) 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: authAccount.id,
      name: RandomGenerator.alphabets(5),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 4. 출석 코드 생성
  const now = new Date();
  const issued_at = now.toISOString();
  const expires_at = new Date(now.getTime() + 3600 * 1000).toISOString(); // 1시간 뒤 만료
  const attendanceCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroom.id,
      teacher_id: authAccount.id,
      code_value: RandomGenerator.alphaNumeric(6),
      issued_at,
      expires_at,
      is_active: true,
    } satisfies IAttendanceAttendanceCode.ICreate,
  });
  typia.assert(attendanceCode);

  // 5. 출석 코드 삭제 요청 실행
  await api.functional.attendance.attendanceCodes.eraseById(connection, {
    id: attendanceCode.id,
  });

  // 6. 정상적으로 예외 없이 204(No Content)가 반환됐음을 검증 (void형, 에러 발생시 실패)
}