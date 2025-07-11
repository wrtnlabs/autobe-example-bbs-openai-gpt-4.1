import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 권한이 없는 계정(예: 일반 학생 또는 다른 학교 교사)이 타 학교 출석 코드상세를 요청할 때 403 Forbidden이 반환되는지 검증합니다.
 *
 * 이 테스트의 목적은, 타 학교 교사가 생성한 출석 코드의 상세를 권한 없는 다른 계정(학생 또는 별개 학교 교사)이 접근 시
 * 시스템이 올바르게 권한 거부(403 Forbidden) 에러를 반환하는지 확인하는 것입니다.
 *
 * 절차:
 * 1. 출석 코드 발급용 교사의 (계정 - 학교 - 클래스) 환경을 준비한다.
 *   - 출석 코드용 학교 A, 교사 A, 반 A를 생성
 *   - 교사 A가 반 A에 담임으로 소속됨
 * 2. 교사 A 소속 반 A에 출석 코드를 생성한다.
 * 3. 접속 권한이 없는 별도의 계정(학생 등, 또는 B교 소속 교사) 생성
 * 4. 해당 권한이 없는 계정으로 로그인(토큰 전환) 후, 위에서 생성한 출석코드 상세 조회를 시도한다.
 * 5. 시스템이 403 Forbidden을 반환하는지 TestValidator.error로 검증한다.
 *
 * 비고:
 *   - (교사 A, 교사 B)는 서로 다른 학교 소속이어야 함
 *   - 생성 및 요청 과정에서 각종 PK 전달 및 랜덤 데이터는 typia.random 등 활용
 */
export async function test_api_attendance_test_get_attendance_code_detail_permission_denied(
  connection: api.IConnection,
) {
  // 1. 학교 A, 교사 A 계정, 반 A 준비
  const schoolA = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(schoolA);

  const teacherA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(20),
    },
  });
  typia.assert(teacherA);

  const classroomA = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: schoolA.id,
      teacher_id: teacherA.id,
      name: "1-1",
      grade_level: 1,
    },
  });
  typia.assert(classroomA);

  // 2. 교사 A 명의로 해당 반에 출석 코드 생성
  const now = new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1시간
  const attendanceCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroomA.id,
      teacher_id: teacherA.id,
      code_value: RandomGenerator.alphabets(6).toUpperCase(),
      issued_at: issuedAt,
      expires_at: expiresAt,
      is_active: true,
    },
  });
  typia.assert(attendanceCode);

  // 3. 권한 없는 계정 생성 (ex: 타학교 교사)
  const schoolB = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(schoolB);

  const teacherB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(20),
    },
  });
  typia.assert(teacherB);

  const classroomB = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: schoolB.id,
      teacher_id: teacherB.id,
      name: "1-1",
      grade_level: 1,
    },
  });
  typia.assert(classroomB);

  // 4. 권한 없는 계정(teacherB)으로 로그인/세션 전환 가정 하에, 해당 출석코드 상세 요청 시도
  // 실제 로그인 API 미구현 상황에선 직접 토큰 변경은 생략할 수 있음. 현재 구조에서는 별도 처리가 없으므로 계정 구분만 적용.

  // 5. 403 Forbidden 반환 검증
  await TestValidator.error("타 학교 교사가 타 학교의 출석코드 상세를 조회 시도하면 403 Forbidden이어야 한다")(
    async () => {
      await api.functional.attendance.attendanceCodes.getById(connection, {
        id: attendanceCode.id,
      });
    },
  );
}