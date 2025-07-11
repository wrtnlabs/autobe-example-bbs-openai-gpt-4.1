import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 출석코드 수정 시 교실 내 코드값 중복 충돌 테스트
 *
 * 동일 교실(classroom) 내 이미 등록된 출석코드(code_value)로 변경/수정 요청 시
 * 서버가 409 Conflict 에러를 반환하는지 검증합니다.
 *
 * 1. 인증 계정 생성 (교사용)
 * 2. 학교 생성
 * 3. 교사용 계정으로 반(classroom) 생성
 * 4. (사전 조건 마련) 동일 교실, 동일 teacher_id로 code_value A, B 출석코드 2건을 각각 등록
 * 5. code_value가 B인 출석코드를 code_value A로 변경 시도 → 409 Conflict가 반드시 발생해야 함
 */
export async function test_api_attendance_test_update_attendance_code_duplicate(
  connection: api.IConnection,
) {
  // 1. 인증 계정 생성 (교사용)
  const teacherEmail: string = typia.random<string & tags.Format<"email">>();
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: teacherEmail,
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(teacherAccount);

  // 2. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 교사용 계정으로 반(classroom) 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherAccount.id,
      name: RandomGenerator.alphaNumeric(4) + "반",
      grade_level: 1,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 4. (사전 조건) 동일 classroom, 동일 teacher: code_value A, B 등록
  const codeValueA = RandomGenerator.alphaNumeric(6).toUpperCase();
  const codeValueB = RandomGenerator.alphaNumeric(6).toUpperCase();
  const issuedAtA = new Date(Date.now()).toISOString();
  const expiresAtA = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const issuedAtB = new Date(Date.now()).toISOString();
  const expiresAtB = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  // A 생성
  const codeA = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroom.id,
      teacher_id: teacherAccount.id,
      code_value: codeValueA,
      issued_at: issuedAtA,
      expires_at: expiresAtA,
      is_active: true,
    } satisfies IAttendanceAttendanceCode.ICreate,
  });
  typia.assert(codeA);

  // B 생성
  const codeB = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroom.id,
      teacher_id: teacherAccount.id,
      code_value: codeValueB,
      issued_at: issuedAtB,
      expires_at: expiresAtB,
      is_active: true,
    } satisfies IAttendanceAttendanceCode.ICreate,
  });
  typia.assert(codeB);

  // 5. B 코드의 code_value를 A로 수정 시도 → 409 Conflict 발생해야 함
  await TestValidator.error("동일 classroom 내 code_value 중복 수정 시 409 오류")(() =>
    api.functional.attendance.attendanceCodes.putById(connection, {
      id: codeB.id,
      body: {
        classroom_id: classroom.id,
        teacher_id: teacherAccount.id,
        code_value: codeValueA, // 이미 존재하는 값으로 덮으려 시도
        issued_at: issuedAtB,
        expires_at: expiresAtB,
        is_active: true,
      } satisfies IAttendanceAttendanceCode.IUpdate,
    })
  );
}