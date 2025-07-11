import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * [동일 이메일로 교사 중복 등록 시 409 에러 확인]
 *
 * 목적: 이미 등록된 이메일로 교사(Teacher)를 생성하는 경우, 409 Conflict 에러가 발생하는지 검증한다.
 *
 * 비즈니스 맥락: 교사 계정은 email이 유니크해야 하며, 중복시 서버가 적절히 거부해야 한다. 본 테스트는 중복 메일에 대한 거부 및 예외 처리가 올바르게 동작하는지 확인한다.
 *
 * 절차:
 * 1. 학교(school)를 생성한다. (school_id 준비)
 * 2. 인증 계정(auth_account)을 생성한다. (auth_account_id 준비)
 * 3. 위에서 생성한 school_id, auth_account_id와 임의의 email 등으로 교사를 최초 1회 생성한다.
 * 4. 같은 email을 사용해 두번째 교사 등록 요청을 시도하며, 이때 409 Conflict 에러가 발생하는지 검증한다.
 */
export async function test_api_attendance_test_create_teacher_with_duplicate_email(
  connection: api.IConnection,
) {
  // 1. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(),
      address: RandomGenerator.paragraph()()
    },
  });
  typia.assert(school);

  // 2. 인증 계정 생성
  const email = typia.random<string & tags.Format<"email">>();
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email,
      password_hash: RandomGenerator.alphaNumeric(16)
    },
  });
  typia.assert(authAccount);

  // 3. 교사 최초 등록
  const teacherInput = {
    school_id: school.id,
    auth_account_id: authAccount.id,
    name: RandomGenerator.name(),
    email,
    phone: RandomGenerator.mobile()
  } satisfies IAttendanceTeacher.ICreate;
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: teacherInput
  });
  typia.assert(teacher);

  // 4. 동일 이메일로 두번째 교사 등록 요청: 409 Conflict 기대
  await TestValidator.error("동일 이메일 중복 등록시 409 반환")(
    async () => {
      await api.functional.attendance.teachers.post(connection, {
        body: {
          ...teacherInput,
          name: RandomGenerator.name(), // 이름만 바꾸고, 이메일 동일하게
          phone: RandomGenerator.mobile(),
        },
      });
    },
  );
}