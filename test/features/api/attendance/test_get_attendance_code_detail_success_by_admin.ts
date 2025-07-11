import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 출석 코드 상세 정보 조회 성공 (관리자/교사 권한)
 *
 * 관리자 또는 교사 계정이 유효한 출석 코드 ID를 이용해 상세 조회를 요청할 때,
 * 해당 출석 코드의 모든 필드(코드 값, 만료 기간, 소속 교실, 담당 교사, 활성화 여부 등)가 정상적으로 반환되는지 검증합니다.
 *
 * 테스트 플로우:
 * 1. 인증 계정(관리자 또는 교사) 생성
 * 2. 테스트 학교 생성
 * 3. 교사 계정과 학교를 이용해 반(classroom) 생성
 * 4. 반/교사 정보를 이용하여 출석 코드 신규 생성
 * 5. 방금 생성한 출석 코드를 getById로 상세 조회
 * 6. 반환 값이 출석 코드 생성 시 입력 정보와 일치하는지, 모든 필수 필드가 올바르게 포함되어 있는지 검증
 */
export async function test_api_attendance_test_get_attendance_code_detail_success_by_admin(
  connection: api.IConnection,
) {
  // 1. 인증 계정(관리자/교사) 생성
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password_hash: RandomGenerator.alphabets(12),
    },
  });
  typia.assert(account);

  // 2. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(school);

  // 3. 반 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: account.id,
      name: RandomGenerator.alphabets(4),
      grade_level: 1,
    },
  });
  typia.assert(classroom);

  // 4. 출석 코드 생성
  const issued_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // +1시간 만료
  const attendanceCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroom.id,
      teacher_id: account.id,
      code_value: RandomGenerator.alphaNumeric(6),
      issued_at,
      expires_at,
      is_active: true,
    },
  });
  typia.assert(attendanceCode);

  // 5. 상세 조회
  const detail = await api.functional.attendance.attendanceCodes.getById(connection, {
    id: attendanceCode.id,
  });
  typia.assert(detail);

  // 6. 상세 조회 결과 검증
  TestValidator.equals('출석 코드 ID 동일')(detail.id)(attendanceCode.id);
  TestValidator.equals('소속 반 ID 동일')(detail.classroom_id)(classroom.id);
  TestValidator.equals('담당 교사 ID 동일')(detail.teacher_id)(account.id);
  TestValidator.equals('코드 값 동일')(detail.code_value)(attendanceCode.code_value);
  TestValidator.equals('만료일 동일')(detail.expires_at)(attendanceCode.expires_at);
  TestValidator.equals('발급일 동일')(detail.issued_at)(attendanceCode.issued_at);
  TestValidator.equals('활성화 상태 동일')(detail.is_active)(attendanceCode.is_active);
}