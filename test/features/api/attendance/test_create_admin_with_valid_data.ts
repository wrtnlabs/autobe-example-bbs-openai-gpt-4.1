import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 정상적인 관리자 계정(Attendance_admin) 생성 흐름 검증
 *
 * 이 테스트는 관리자 계정 생성의 기본적인 성공 케이스를 다룹니다. (필수 정보 입력 및 참조 무결성)
 *
 * 1. 선행 준비: 소속 학교 엔터티를 먼저 생성한다. (school_id 참조 무결성 보장)
 * 2. 선행 준비: 인증 계정도 미리 생성한다. (auth_account_id 값 FK 무결성)
 * 3. 실제 관리자 생성 API 호출 시 위 두 엔터티의 PK, 그리고 name, email의 고유/필수 조건을 모두 올바르게 반영한다.
 * 4. 생성 후 반환값에서 각 입력값이 정확히 저장됐는지, DB에서 부여된 PK(및 날짜 등)가 올바른지도 검증한다.
 * 5. unique 조건(이메일 등) 위반 없는 정상 상황만 체크한다.
 *
 * 주요 검증 포인트
 * - 입력 school_id, auth_account_id의 참조 무결성
 * - email 유니크 제약 및 저장
 * - 반환 데이터의 값 일치와 필드 포함 여부
 */
export async function test_api_attendance_test_create_admin_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 소속 학교 생성
  const schoolInput: IAttendanceSchool.ICreate = {
    name: RandomGenerator.name() + "학교",
    address: RandomGenerator.paragraph()(2),
  };
  const school = await api.functional.attendance.schools.post(connection, {
    body: schoolInput,
  });
  typia.assert(school);

  // 2. 인증 계정 생성
  const authEmail = typia.random<string & tags.Format<"email">>();
  const authAccountInput: IAttendanceAuthAccount.ICreate = {
    email: authEmail,
    password_hash: RandomGenerator.alphaNumeric(12),
  };
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: authAccountInput,
  });
  typia.assert(authAccount);

  // 3. 관리자 계정 생성
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminInput: IAttendanceAdmin.ICreate = {
    school_id: school.id,
    auth_account_id: authAccount.id,
    name: RandomGenerator.name(),
    email: adminEmail,
  };
  const admin = await api.functional.attendance.admins.post(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 4. 반환 데이터 검증
  TestValidator.equals("school_id 저장 일치")(admin.school_id)(school.id);
  TestValidator.equals("auth_account_id 저장 일치")(admin.auth_account_id)(authAccount.id);
  TestValidator.equals("이름 저장 일치")(admin.name)(adminInput.name);
  TestValidator.equals("이메일 저장 일치")(admin.email)(adminEmail);
  TestValidator.predicate("id(UUID 포맷)")(typeof admin.id === "string" && admin.id.length > 0);
  TestValidator.predicate("생성일시와 수정일시가 초기 세팅됨")(
    typeof admin.created_at === "string" &&
      typeof admin.updated_at === "string" &&
      admin.created_at.length > 0 &&
      admin.updated_at.length > 0,
  );
}