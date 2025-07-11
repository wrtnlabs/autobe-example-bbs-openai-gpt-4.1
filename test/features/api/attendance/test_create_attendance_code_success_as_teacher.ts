import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 교사 권한 계정으로 출석 코드 정상 발급 시나리오 E2E 테스트
 *
 * - 출석 코드 발급은 교사 계정으로만 가능하므로, 먼저 교사 역할의 인증 계정을 생성한다.
 * - 출석 코드가 발급될 학교를 신규로 하나 등록한다.
 * - 출석 코드가 소속될 반(클래스)을, 해당 학교와 생성된 교사 계정으로 새로 만든다.
 * - 위 준비된(유효한) 교사·학교·반 정보를 기반으로,
 *   - 적합한 코드값(영문 대문자/숫자 6자리),
 *   - 발급 및 만료 시각(현재 시각, 현재+30분 등),
 *   - 활성화 플래그 true,
 *   을 입력 parameter로 삼아 출석 코드 발급 API를 호출한다.
 * - API 성공 시, 반환 객체의 모든 필드(반, 교사, 코드, 시각, 활성화여부 등)가 올바르게 반환되는지 확인한다.
 * - 이후 실제 DB에 해당 출석 코드의 정보가 등록되었는지는 typia.assert 및 TestValidator로 값 검증까지 수행한다.
 */
export async function test_api_attendance_test_create_attendance_code_success_as_teacher(
  connection: api.IConnection,
) {
  // 1. 교사 역할 인증 계정 생성 (테스트 목적상 이메일/패스워드 랜덤)
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
      address: RandomGenerator.paragraph()(2),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 반(클래스) 생성 (교사·학교 연결)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherAccount.id,
      name: RandomGenerator.alphabets(4) + RandomGenerator.alphaNumeric(2),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 4. 출석코드 발급 => 유효한 코드/타이밍/연결 값 등 입력
  const codeValue = RandomGenerator.alphaNumeric(6).toUpperCase();
  const nowISO = new Date().toISOString();
  const expiresISO = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 현재+30분
  const attendanceCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroom.id,
      teacher_id: teacherAccount.id,
      code_value: codeValue,
      issued_at: nowISO,
      expires_at: expiresISO,
      is_active: true,
    } satisfies IAttendanceAttendanceCode.ICreate,
  });
  typia.assert(attendanceCode);

  // 5. 반환된 객체 필드 값 검증
  TestValidator.equals("classroom 연결 확인")(attendanceCode.classroom_id)(classroom.id);
  TestValidator.equals("teacher 연결 확인")(attendanceCode.teacher_id)(teacherAccount.id);
  TestValidator.equals("코드 값 확인")(attendanceCode.code_value)(codeValue);
  TestValidator.equals("발급시각 확인")(attendanceCode.issued_at)(nowISO);
  TestValidator.equals("만료시각 확인")(attendanceCode.expires_at)(expiresISO);
  TestValidator.equals("활성화 플래그 확인")(attendanceCode.is_active)(true);
}