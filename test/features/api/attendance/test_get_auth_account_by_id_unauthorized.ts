import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 인증되지 않은 사용자 또는 비관리자의 /attendance/auth/accounts/{id} 접근 차단 테스트
 *
 * 이 테스트는 인증계정 상세 정보 열람을 위한 GET /attendance/auth/accounts/{id} 엔드포인트에 대해
 * (1) 인증 정보가 없는 사용자(Authorization이 없는 connection)가 호출할 때 401 Unauthorized 에러가 반환되는지 확인하는데 목적이 있습니다.
 * (2) 관리자 잉외 권한 계정(예: 일반 교사, 보호자 등)으로 접근 시 403 Forbidden 처리가 필요한데, 현재 제공된 SDK 내 별도 인증/로그인 API가 없어 직접 구현은 불가합니다.
 * 추후 로그인/인증 지원 API 추가 시 보완 테스트가 필요합니다.
 *
 * 테스트 시나리오
 * 1. 임의의 UUID를 준비해 /attendance/auth/accounts/:id 엔드포인트에 인증정보 없이 호출
 * 2. HttpError가 발생하는지(401 Unauthorized 등) TestValidator.error()로 확인
 */
export async function test_api_attendance_auth_accounts_test_get_auth_account_by_id_unauthorized(
  connection: api.IConnection,
) {
  // 1. 임의의 인증계정 ID(UUID) 준비
  const fakeId = typia.random<string & tags.Format<"uuid">>();

  // 2. Authorization 없는 connection 생성
  const connWithoutAuth: api.IConnection = {
    ...connection,
    headers: Object.fromEntries(
      Object.entries(connection.headers ?? {}).filter(
        ([key]) => key.toLowerCase() !== "authorization"
      ),
    ),
  };

  // 3. 인증정보 없이 상세 조회 시도 → 401/403 에러 기대
  await TestValidator.error("비인증 사용자는 401/403 오류 발생해야 함")(async () => {
    await api.functional.attendance.auth.accounts.getById(connWithoutAuth, {
      id: fakeId,
    });
  });
}