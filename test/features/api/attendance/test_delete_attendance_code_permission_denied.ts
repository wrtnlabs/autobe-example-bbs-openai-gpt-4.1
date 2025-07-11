import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 출석 코드 삭제 권한 제한 검증 (403 Forbidden 반환)
 *
 * 본 테스트는, 한 학교에 소속된 출석코드를 타 학교 교사/학생 등 권한 없는 계정에서 삭제(DELETE) 요청할 경우 403 Forbidden 에러가 정상적으로 반환되는지 검증합니다.
 *
 * 주요 단계:
 * 1. 권한 없는 사용자 계정(타 학교의 인증 계정) 생성
 * 2. 출석 코드가 귀속될 학교 A 엔티티 생성
 * 3. 학교 A에 속한 교사 계정 생성 및 해당 교사로 반(클래스룸) 엔티티 생성
 * 4. 해당 반 소속 출석 코드 등록
 * 5. 권한 없는 사용자 계정으로 로그인/인증(테스트용, 실제 구체 인증처리는 테스트 infra에 따라 생략/가정)
 * 6. 권한 없는 계정으로 출석 코드 삭제 시도
 * 7. 403 Forbidden 에러 응답 여부 검증
 *
 * 유의 사항:
 * - 테스트 내에서 각 엔티티의 소속/소유 관계를 명확하게 설정해야 하며, 삭제 요청자는 출석 코드가 소속된 학교나 반(teacher)와 무관해야 함.
 * - 실제 환경에서는 권한 없는 사용자의 access token 또는 context가 필요하나, E2E infra에서 해당 user 계정이 사용되어야 함을 가정함.
 */
export async function test_api_attendance_test_delete_attendance_code_permission_denied(
  connection: api.IConnection,
) {
  // 1. 권한 없는 사용자 계정(타 학교용) 생성
  const unauthorizedAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(unauthorizedAccount);

  // 2. 테스트용 학교 생성 (학교 A)
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name() + "학교",
      address: RandomGenerator.name() + "시 " + RandomGenerator.name() + "로 99",
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 학교 A에 소속된 교사 계정 생성 및 반 생성
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(teacherAccount);

  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherAccount.id,
      name: "1-1",
      grade_level: 1,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 4. 해당 반 소속 출석 코드 등록
  const attendanceCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroom.id,
      teacher_id: teacherAccount.id,
      code_value: RandomGenerator.alphaNumeric(6),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      is_active: true,
    } satisfies IAttendanceAttendanceCode.ICreate,
  });
  typia.assert(attendanceCode);

  // 5. (가정) 권한 없는 계정 사용 context 전환 (E2E 테스트 infra에서 지원되는 경우)

  // 6. 권한 없는 사용자가 출석 코드 삭제 요청
  await TestValidator.error("권한 없는 계정의 출석 코드 삭제 시 403 Forbidden 반환")(
    async () => {
      await api.functional.attendance.attendanceCodes.eraseById(connection, {
        id: attendanceCode.id,
      });
    },
  );
}