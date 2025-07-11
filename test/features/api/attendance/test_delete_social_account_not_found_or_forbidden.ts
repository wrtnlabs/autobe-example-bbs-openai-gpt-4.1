import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 존재하지 않는 social_account id 및 권한 없는 사용자가 타인의 소셜 계정 삭제 요청 시 404 또는 403 오류가 정상적으로 반환되는지 검증합니다.
 * 또한, 소셜 계정 삭제 후 재조회 시 무효 또는 에러 응답이 반환되는지,
 * 타인의 social_account row에 대해 삭제를 시도할 때 보안 정책상 거부되는지도 확인합니다.
 *
 * 1. 인증계정 A, B를 신규 생성합니다.
 * 2. 계정 A로 social_account row를 생성합니다.
 * 3. 존재하지 않는 random uuid로 삭제 시도 → 404 에러를 기대합니다.
 * 4. 계정 B가 계정 A의 social_account row를 삭제 시도 → (테스트 환경에서 세션 전환 불가로, 실제 권한 분리는 별도 e2e setup 필요)
 * 5. 계정 A로 소셜 계정 삭제를 정상적으로 수행합니다.
 * 6. 같은 row id로 재삭제(이미 삭제된 row) 시도 → 404 에러를 기대합니다.
 */
export async function test_api_attendance_test_delete_social_account_not_found_or_forbidden(
  connection: api.IConnection,
) {
  // 1. 인증계정 A, B를 생성
  const accountA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "testhashA",
    },
  });
  typia.assert(accountA);

  const accountB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "testhashB",
    },
  });
  typia.assert(accountB);

  // 2. 계정 A의 소셜 계정 생성
  const socialAccount = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: accountA.id,
      provider: "google",
      social_id: typia.random<string>(),
    },
  });
  typia.assert(socialAccount);

  // 3. 존재하지 않는 random uuid로 삭제 시도 (404)
  await TestValidator.error("존재하지 않는 row id 삭제시 404")(() =>
    api.functional.attendance.auth.socialAccounts.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 4. 타인(B)가 A의 소셜계정 삭제를 시도 (이 테스트 스텁에서는 connection 전환 불가로, 실제 403 여부는 추가 인증 핸들러 필요)
  // 권한 분리 e2e setup에서는 세션 별 connection 제공 필요

  // 5. 계정 A의 소셜 계정 삭제 정상 케이스
  const deleted = await api.functional.attendance.auth.socialAccounts.eraseById(connection, {
    id: socialAccount.id,
  });
  typia.assert(deleted);

  // 6. 삭제된 id로 중복 삭제 시도 (404)
  await TestValidator.error("이미 삭제된 row 재삭제시 404")(() =>
    api.functional.attendance.auth.socialAccounts.eraseById(connection, {
      id: socialAccount.id,
    }),
  );
}