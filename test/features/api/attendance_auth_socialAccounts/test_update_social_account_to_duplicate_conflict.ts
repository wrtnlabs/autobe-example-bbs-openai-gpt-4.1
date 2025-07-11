import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 서로 다른 정보를 가진 두 개의 소셜 계정(IAttendanceSocialAccount)을 생성 후,
 * 한 계정의 provider/social_id 조합을 다른 계정의 값과 같도록 수정 시도.
 *
 * 요구사항: provider/social_id의 유니크 제약으로 409 Conflict가 발생해야 함을 검증합니다.
 *
 * 1. 첫 번째 인증 계정 생성 (accountA)
 * 2. 두 번째 인증 계정 생성 (accountB)
 * 3. 서로 다른 provider/social_id로 두 소셜 계정 생성 (socialA, socialB)
 * 4. socialA의 provider/social_id를 socialB와 동일하게 수정 시도
 * 5. 수정 요청이 409 오류(중복)로 막히는지 TestValidator.error()로 검증
 */
export async function test_api_attendance_auth_socialAccounts_test_update_social_account_to_duplicate_conflict(
  connection: api.IConnection,
) {
  // 1. 첫 번째 인증 계정 생성
  const accountA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
    },
  });
  typia.assert(accountA);

  // 2. 두 번째 인증 계정 생성
  const accountB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
    },
  });
  typia.assert(accountB);

  // 3. 서로 다른 provider/social_id로 두 소셜 계정 생성
  const socialA = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: accountA.id,
      provider: "google",
      social_id: "A_" + typia.random<string>(),
    },
  });
  typia.assert(socialA);

  const socialB = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: accountB.id,
      provider: "google",
      social_id: "B_" + typia.random<string>(),
    },
  });
  typia.assert(socialB);

  // 4. socialA의 provider/social_id를 socialB와 동일하게 수정 시도 (충돌)
  await TestValidator.error("provider/social_id 중복 충돌 시 409 응답")(
    async () => {
      await api.functional.attendance.auth.socialAccounts.putById(connection, {
        id: socialA.id,
        body: {
          provider: socialB.provider,
          social_id: socialB.social_id,
        },
      });
    },
  );
}