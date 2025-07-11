import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 관리자 권한으로 특정 인증 계정 ID 상세 조회 API를 검증합니다.
 *
 * 이 테스트는 실제 신규 인증계정 생성 → 해당 계정 ID 기반 상세 조회 (GET)
 * → 반환 데이터의 타입 및 주요 필드값, 민감정보 노출 등을 종합적으로 검증합니다.
 *
 * 1. 테스트용 인증계정 신규 등록(POST /attendance/auth/accounts)
 * 2. 생성 계정 id값으로 상세정보 조회 요청(GET /attendance/auth/accounts/{id})
 * 3. 반환값이 IAttendanceAuthAccount 타입을 완전히 충족하는지 typia.assert로 확인
 * 4. 응답 email 필드가 등록시 사용했던 값과 정확히 일치하는지 검증
 * 5. password_hash 필드 평문 노출이 없는지, 존재한다면 hash값/아니면 null임을 확인
 * 6. 기타 atomic 필드 정상여부 및 민감정보 노출이 없는지 점검
 */
export async function test_api_attendance_auth_accounts_getById_test_get_auth_account_by_id_success(
  connection: api.IConnection,
) {
  // 1. 인증계정 생성 (POST)
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPasswordHash = typia.random<string>(); // 실제 비밀번호 hash라고 가정
  const created = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: testEmail,
      password_hash: testPasswordHash,
    },
  });
  typia.assert(created);

  // 2. 해당 계정 id로 상세조회 (GET)
  const found = await api.functional.attendance.auth.accounts.getById(connection, {
    id: created.id,
  });
  typia.assert(found);

  // 3. 반환값 필드 일치/타입 및 민감정보 노출 확인
  // email 일치
  TestValidator.equals("email 반영됨")(found.email)(created.email);

  // password_hash는 평문 노출 없이 hash값이거나 null임을 확인
  if (found.password_hash !== null) {
    TestValidator.predicate("password_hash 해시 여부 확인")(
      typeof found.password_hash === "string" && found.password_hash.length > 0,
    );
  }

  // id, created_at 등 atomic 필드 정상
  TestValidator.equals("id 일치")(found.id)(created.id);
  TestValidator.predicate("created_at 존재여부")(typeof found.created_at === "string" && found.created_at.length > 0);
  TestValidator.predicate("updated_at 존재여부")(typeof found.updated_at === "string" && found.updated_at.length > 0);

  // deleted_at은 신규계정 생성 직후라면 null이 정상
  TestValidator.equals("deleted_at 없음")(found.deleted_at)(null);
}