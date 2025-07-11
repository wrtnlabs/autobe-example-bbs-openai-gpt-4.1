import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 출석 코드 발급 권한 없는 계정(예: 학생 등)이 출석 코드 발급 시 403 Forbidden이 발생하는지 검증
 *
 * - 학교 및 반(클래스) 테스트 데이터를 준비
 * - 출석 코드 발급 권한 없는 인증 계정 생성 및 활용
 * - 권한 없는 상태에서 출석 코드 생성 API 호출 시 403 Forbidden 반환되는지 검증
 *
 * [테스트 과정]
 * 1. 권한 없는 인증 계정(학생 등) 생성
 * 2. 테스트용 학교 등록
 * 3. 해당 학교에 반(teacher_id는 더미 UUID 사용) 등록
 * 4. 위 학생 계정으로 출석 코드 발급 시도(403 Forbidden 발생 확인)
 */
export async function test_api_attendance_test_create_attendance_code_with_invalid_role(
  connection: api.IConnection,
) {
  // 1. 출석 코드 발급 권한이 없는 임의 계정(이메일, 비밀번호) 생성
  const studentEmail: string = typia.random<string & tags.Format<"email">>();
  const studentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: studentEmail,
      password_hash: "test1234",
    },
  });
  typia.assert(studentAccount);

  // 2. 테스트용 학교 등록
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: "테스트학교-" + RandomGenerator.alphaNumeric(6),
      address: "서울시 강남구 테스트로 123",
    },
  });
  typia.assert(school);

  // 3. 반(클래스) 등록 (teacher_id는 임의 UUID 사용)
  const dummyTeacherId: string = typia.random<string & tags.Format<"uuid">>();
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: dummyTeacherId,
      name: "1-1반",
      grade_level: 1,
    },
  });
  typia.assert(classroom);

  // 4. 권한 없는 계정으로 출석 코드 발급 시도→ 403 Forbidden (권한 없음) 에러 검증
  await TestValidator.error("출석 코드 발급 권한 없는 계정 403 에러 검증")(
    () =>
      api.functional.attendance.attendanceCodes.post(connection, {
        body: {
          classroom_id: classroom.id,
          teacher_id: dummyTeacherId,
          code_value: RandomGenerator.alphaNumeric(6),
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          is_active: true,
        },
      }),
  );
}