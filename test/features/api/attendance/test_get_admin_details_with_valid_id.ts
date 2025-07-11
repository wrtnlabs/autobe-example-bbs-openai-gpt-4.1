import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 관리자 권한으로 특정 관리자(id) 상세 정보를 조회하는 테스트입니다.
 *
 * - 본인의 정보와 타 관리자의 정보를 모두 정상적으로 조회할 수 있어야 합니다.
 * - 응답 데이터의 각 필드가 정확히 일관성 있게 반환되는지 검증합니다.
 *
 * [테스트 단계]
 * 1. 샘플 관리자 계정을 새로 생성합니다.
 * 2. getById API로 해당 관리자의 상세정보를 조회합니다.
 * 3. 생성 시 반환된 정보와 조회 API 반환 결과가 일치하는지 확인합니다.
 * 4. 타 관리자 계정도 추가 생성해서 해당 id로 상세정보 조회 결과를 검증합니다.
 */
export async function test_api_attendance_admins_getById(
  connection: api.IConnection,
) {
  // 1. 샘플 관리자 생성 (최상위 관리자)
  const adminCreateInput: IAttendanceAdmin.ICreate = {
    school_id: undefined, // 최상위 관리자는 school_id를 설정하지 않음
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
  };
  const created: IAttendanceAdmin = await api.functional.attendance.admins.post(connection, { body: adminCreateInput });
  typia.assert(created);

  // 2. 생성된 관리자의 상세 정보 조회
  const read: IAttendanceAdmin = await api.functional.attendance.admins.getById(connection, { id: created.id });
  typia.assert(read);

  // 3. 생성 정보와 상세조회 결과 필드 단위 비교
  TestValidator.equals("관리자 id")(read.id)(created.id);
  TestValidator.equals("auth_account_id")(read.auth_account_id)(created.auth_account_id);
  TestValidator.equals("name")(read.name)(created.name);
  TestValidator.equals("email")(read.email)(created.email);
  TestValidator.equals("school_id")(read.school_id)(created.school_id);

  // 4. 타 관리자 계정 추가 생성 및 상세조회
  const otherAdminInput: IAttendanceAdmin.ICreate = {
    school_id: undefined,
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@other.com`,
  };
  const other: IAttendanceAdmin = await api.functional.attendance.admins.post(connection, { body: otherAdminInput });
  typia.assert(other);

  const otherRead: IAttendanceAdmin = await api.functional.attendance.admins.getById(connection, { id: other.id });
  typia.assert(otherRead);
  TestValidator.equals("타 관리자 id")(otherRead.id)(other.id);
  TestValidator.equals("auth_account_id")(otherRead.auth_account_id)(other.auth_account_id);
  TestValidator.equals("name")(otherRead.name)(other.name);
  TestValidator.equals("email")(otherRead.email)(other.email);
  TestValidator.equals("school_id")(otherRead.school_id)(other.school_id);
}