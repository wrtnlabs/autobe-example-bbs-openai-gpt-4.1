import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 출석코드(AttendanceCode) 수정에 대한 권한 없는 계정 접근 거부(Forbidden) E2E 테스트
 *
 * 출석코드 수정(putById) API에서 권한 없는 계정(예: 학생, 타 학교 교사 등)이
 * 출석코드를 수정하려 할 때 403 Forbidden이 반환되는지를 검증하는 시나리오입니다.
 * 실제 수정 대상 출석코드가 속한 학교와 클래스룸/선생과 무관한 계정을 사용해 접근합니다.
 *
 * 1. 시나리오용 학교 데이터를 생성합니다.
 * 2. 실제 출석코드가 소속된 교실(클래스룸)을 생성합니다.
 * 3. 그 교실에 소속된 출석코드 엔티티를 생성합니다(teacher_id는 임의 uuid).
 * 4. 수정권한이 없는 인증 계정(예: 학생)을 생성합니다.
 * 5. 해당 권한 없는 계정의 id로 출석코드 수정을 시도했을 때 403 Forbidden 에러가 반환되는지 TestValidator로 검증합니다.
 */
export async function test_api_attendance_test_update_attendance_code_permission_denied(
  connection: api.IConnection,
) {
  // 1. 시나리오용 학교 데이터 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(school);

  // 2. 교실(클래스룸) 생성 (교사 id는 임의 uuid)
  const dummyTeacherId = typia.random<string & tags.Format<"uuid">>();
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: dummyTeacherId,
      name: RandomGenerator.alphaNumeric(4),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    },
  });
  typia.assert(classroom);

  // 3. 출석코드 엔티티 생성
  const attendanceCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroom.id,
      teacher_id: dummyTeacherId,
      code_value: RandomGenerator.alphaNumeric(6),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      is_active: true,
    },
  });
  typia.assert(attendanceCode);

  // 4. 권한 없는 인증 계정 생성
  const forbiddenAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(forbiddenAccount);

  // 5. 권한 없는 계정으로 출석코드 수정 시도 - 403 Forbidden 검증
  await TestValidator.error("권한 없는 계정은 출석코드 수정 시 403이 반환되어야 함")(
    async () => {
      await api.functional.attendance.attendanceCodes.putById(connection, {
        id: attendanceCode.id,
        body: {
          classroom_id: classroom.id,
          teacher_id: forbiddenAccount.id,
          code_value: RandomGenerator.alphaNumeric(6),
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          is_active: false,
        },
      });
    },
  );
}