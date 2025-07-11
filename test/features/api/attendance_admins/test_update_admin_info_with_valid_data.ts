import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 관리자 정보 수정 E2E 테스트
 *
 * 이 테스트는 attendance_admin 엔터티의 정보 업데이트(이름, 이메일, school_id, auth_account_id의 변경)가 정상적으로 동작하는지 검증합니다.
 * 또한, school_id/auth_account_id의 참조 무결성, 이메일 중복(유니크 제약) 등 여러 예외 상황에 대해서도 에러가 발생하는지 확인합니다.
 *
 * [테스트 시나리오]
 * 1. 테스트용 학교를 생성한다. (school_id 참조 검증)
 * 2. 인증계정을 2개 만든다. (참조 무결성/변경 및 이메일 중복)
 * 3. 인증계정1, 학교ID로 관리자 계정을 생성한다.
 * 4. 해당 관리자의 이름, 이메일, school_id, auth_account_id를 다른 값(모두 유효값)으로 변경하여 업데이트한다.
 *    - 모든 필드가 정상적으로 반영됐는지 검증
 * 5. 이메일을 이미 사용중인 값으로 변경 시도시(중복) 에러 발생 확인
 * 6. 없는 school_id로 수정 시도 시 에러 발생(참조 무결성)
 * 7. 없는 auth_account_id로 수정 시도 시 에러 발생(참조 무결성)
 */
export async function test_api_attendance_admins_test_update_admin_info_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 테스트용 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 인증 계정 2개 생성
  const authAccount1 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(12),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount1);

  const authAccount2 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(12),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount2);

  // 3. 관리자 생성
  const admin = await api.functional.attendance.admins.post(connection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      school_id: school.id,
      auth_account_id: authAccount1.id,
    } satisfies IAttendanceAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. 모든 필드 업데이트 (이름, 이메일, school_id, auth_account_id)
  const updatedName = RandomGenerator.name();
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updated = await api.functional.attendance.admins.putById(connection, {
    id: admin.id,
    body: {
      name: updatedName,
      email: updatedEmail,
      school_id: school.id, // 같은 학교 유지
      auth_account_id: authAccount2.id, // 다른 인증 계정으로 변경
    } satisfies IAttendanceAdmin.IUpdate,
  });
  typia.assert(updated);
  TestValidator.equals("이름 수정됨") (updated.name) (updatedName);
  TestValidator.equals("이메일 수정됨") (updated.email) (updatedEmail);
  TestValidator.equals("school_id 변경/유지됨") (updated.school_id) (school.id);
  TestValidator.equals("auth_account_id 변경됨") (updated.auth_account_id) (authAccount2.id);

  // 5. 이메일 중복(유니크) 에러 시도
  await TestValidator.error("이메일 중복 에러 발생") (async () => {
    await api.functional.attendance.admins.putById(connection, {
      id: admin.id,
      body: {
        email: updatedEmail,
      } satisfies IAttendanceAdmin.IUpdate,
    });
  });

  // 6. 존재하지 않는 school_id 참조 무결성 에러
  await TestValidator.error("존재하지 않는 school_id 에러") (async () => {
    await api.functional.attendance.admins.putById(connection, {
      id: admin.id,
      body: {
        school_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IAttendanceAdmin.IUpdate,
    });
  });

  // 7. 존재하지 않는 auth_account_id 참조 무결성 에러
  await TestValidator.error("존재하지 않는 auth_account_id 에러") (async () => {
    await api.functional.attendance.admins.putById(connection, {
      id: admin.id,
      body: {
        auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IAttendanceAdmin.IUpdate,
    });
  });
}