import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 인증 계정 정보 수정 시 권한 없는 사용자에 대한 접근 차단 검증 테스트
 *
 * 이 테스트는 인증되지 않은(로그인하지 않은) 사용자가 특정 인증계정의 정보를 수정하려 할 때,
 * 시스템이 401 Unauthorized 에러를 반환하는지 검증합니다.
 * 또한 실제 입력 정보 상에서 권한을 가진 '유저' 개념이나 별도의 인증/가입 API 없으므로,
 * 계정 소유자가 아닌 사용자의 403 Forbidden은 검증하지 못합니다. (API 제공시 추가 필요)
 *
 * 테스트 플로우:
 * 1. 아무 인증 없이 인증계정 정보 수정 시도 → 401 Unauthorized 발생 확인
 */
export async function test_api_attendance_auth_accounts_test_update_auth_account_no_permission(
  connection: api.IConnection,
) {
  // 1. 인증 없이 계정 수정 시도 – 401 Unauthorized 반드시 발생
  await TestValidator.error("비인증 상태에서 계정 수정 시도시 401 오류가 발생해야 한다")(() =>
    api.functional.attendance.auth.accounts.putById(
      // 인증정보 없는 connection (header 제거)
      { ...connection, headers: {} },
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IAttendanceAuthAccount.IUpdate,
      },
    ),
  );
  // ※ 실제 사용자 권한(403 Forbidden) 검증은 계정 생성 및 인증 API가 제공될 때 구현 필요
}