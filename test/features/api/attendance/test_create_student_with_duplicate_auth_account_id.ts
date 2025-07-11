import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 동일 인증 계정(auth_account_id)로 학생 중복 등록 시도 시 409 Conflict 오류를 검증
 *
 * 인증 계정을 생성하고, 해당 계정으로 학생을 이미 등록한 후, 동일 인증 계정으로 다시 학생을 등록하면
 * 409 Conflict(중복 오류)가 발생해야 함을 검증한다.
 *
 * 전체 과정:
 * 1. 인증 계정 생성 (attendance/auth/accounts)
 * 2. 학교 데이터 생성 (attendance/schools)
 * 3. 담임 교사 UUID 준비 (랜덤 값 사용)
 * 4. 학급 데이터 생성 (attendance/classrooms)
 * 5. 학생 1명 등록 (attendance/students)
 * 6. 동일 auth_account_id로 학생 등록 재시도 (에러 발생 확인)
 */
export async function test_api_attendance_test_create_student_with_duplicate_auth_account_id(
  connection: api.IConnection,
) {
  // 1. 인증 계정 생성
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // 2. 학교 데이터 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 담임 교사 UUID 준비 (랜덤 값)
  const teacherId = typia.random<string & tags.Format<"uuid">>();

  // 4. 학급 데이터 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherId,
      name: RandomGenerator.alphabets(3),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 5. 학생 1명 등록
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: authAccount.id,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: typia.random<string & tags.Format<"date-time">>(),
      // parent_id는 생략 또는 undefined/랜덤 처리 가능
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 6. 동일 auth_account_id로 학생 등록 재시도 (409 Conflict 발생 확인)
  await TestValidator.error("auth_account_id 중복일 때 409 에러.")(async () => {
    await api.functional.attendance.students.post(connection, {
      body: {
        school_id: school.id,
        classroom_id: classroom.id,
        auth_account_id: authAccount.id,
        name: RandomGenerator.name(),
        gender: RandomGenerator.pick(["male", "female"]),
        birthdate: typia.random<string & tags.Format<"date-time">>(),
      } satisfies IAttendanceStudent.ICreate,
    });
  });
}