import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 이미 등록된 이메일/아이디(auth_account_id)로 관리자 신규 생성 시 409 오류(유니크 제약 위반)가 발생하는지 테스트합니다.
 *
 * 1. 선행: 학교 엔터티를 하나 생성한다. (school_id 참조 무결성 확보)
 * 2. 선행: 인증계정(AttendanceAuthAccount) 엔터티를 하나 생성한다. (auth_account_id 확보)
 * 3. 선행: 위에서 생성한 school_id와 auth_account_id + 무작위 이메일로 정상 관리자 신규 생성 API를 호출한다. (중복 방지 위함)
 * 4. 같은 이메일/같은 인증계정 id를 사용하여 관리자 신규 생성 API를 한 번 더 호출해본다.
 *  - 이때 409 에러(유니크 제약 위반)가 발생해야 한다.
 *  - TestValidator.error로 예외 발생 여부만 검증한다.
 */
export async function test_api_attendance_test_create_admin_with_duplicate_email(
  connection: api.IConnection,
) {
  // 1. 선행: 학교 엔터티 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 인증계정 생성
  const email = typia.random<string & tags.Format<"email">>();
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email,
      password_hash: RandomGenerator.alphaNumeric(12),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 3. 정상 관리자 계정 생성
  const adminInput = {
    school_id: school.id,
    auth_account_id: account.id,
    name: RandomGenerator.name(),
    email,
  } satisfies IAttendanceAdmin.ICreate;
  const admin = await api.functional.attendance.admins.post(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 4. 같은 이메일, 같은 인증계정으로 중복 등록 시도 → 409 에러 확인
  await TestValidator.error("동일 이메일/계정 중복 생성시 409 에러 발생")(async () => {
    await api.functional.attendance.admins.post(connection, {
      body: adminInput,
    });
  });
}