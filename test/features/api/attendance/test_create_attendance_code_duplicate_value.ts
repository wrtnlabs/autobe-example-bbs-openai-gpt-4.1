import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 출석코드 생성 API의 중복 코드값(Conflict, 409) 검증 E2E 테스트
 *
 * 본 테스트는 다음과 같은 시나리오를 검증합니다:
 * 동일 교실(classroom), 동일 코드값(code_value), 동일 활성기간(issued_at/expires_at, is_active)의 출석코드가 이미 존재할 경우,
 * 해당 정보로 출석코드 생성(POST /attendance/attendanceCodes)을 다시 요청하면 서버가 409(Conflict) 에러를 반환해야 합니다.
 *
 * [진행 절차]
 * 1. 테스트용 교사(관리자) 계정 생성 (POST /attendance/auth/accounts)
 * 2. 테스트용 학교 데이터 생성 (POST /attendance/schools)
 * 3. 학교 및 교사 정보를 사용해 교실 생성 (POST /attendance/classrooms)
 * 4. 교실/교사/코드값/기간 동일한 출석코드 한 번 생성 (성공 응답)
 * 5. 똑같은 정보로 출석코드 중복 생성 요청 (409 Conflict 검증)
 */
export async function test_api_attendance_test_create_attendance_code_duplicate_value(
  connection: api.IConnection,
) {
  // 1. 테스트용 교사(관리자) 계정 생성
  const accountEmail = typia.random<string & tags.Format<"email">>();
  const accountPassword = RandomGenerator.alphaNumeric(12);
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: accountEmail,
      password_hash: accountPassword,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(teacherAccount);

  // 2. 테스트용 학교 데이터 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(8),
      address: RandomGenerator.paragraph()(1),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 교실 생성 (school_id, teacher_id 이용)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherAccount.id,
      name: RandomGenerator.alphabets(4),
      grade_level: 3,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 4. 출석코드 생성 (해당 교실, 교사)
  const codeValue = RandomGenerator.alphaNumeric(6).toUpperCase();
  const issuedAt = new Date(Date.now()).toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // +1시간

  const codeCreateInput = {
    classroom_id: classroom.id,
    teacher_id: teacherAccount.id,
    code_value: codeValue,
    issued_at: issuedAt,
    expires_at: expiresAt,
    is_active: true,
  } satisfies IAttendanceAttendanceCode.ICreate;

  const firstCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: codeCreateInput,
  });
  typia.assert(firstCode);

  // 5. 동일 정보로 같은 코드 중복 생성 -> 409 Conflict 에러 검증
  await TestValidator.error("Duplicate attendance code triggers conflict")(
    () => api.functional.attendance.attendanceCodes.post(connection, {
      body: codeCreateInput,
    })
  );
}