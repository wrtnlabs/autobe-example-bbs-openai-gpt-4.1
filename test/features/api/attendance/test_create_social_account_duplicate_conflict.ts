import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 동일 (provider, social_id) 소셜 계정 중복 등록 시 409 Conflict 에러를 검증합니다.
 *
 * - 소셜 계정 매핑은 (provider, social_id) 유니크 정책이 적용되어야 하므로, 동일 값 2회 등록 시 반드시 에러를 발생시켜야 합니다.
 *
 * 테스트 순서
 * 1. 내부 인증 계정을 생성합니다.
 * 2. provider/social_id 쌍을 지정하여 소셜 계정을 1회 정상 등록합니다.
 * 3. 동일 provider/social_id 쌍으로 다시 등록 시도를 하여 409 Conflict 에러(중복 유니크 제약 위반)가 발생하는지 검증합니다.
 */
export async function test_api_attendance_test_create_social_account_duplicate_conflict(
  connection: api.IConnection,
) {
  // 1. 내부 인증 계정 신규 생성
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 2. provider/social_id 값 지정 및 최초 소셜 계정 등록
  const provider: string = "google";
  const socialId: string = RandomGenerator.alphaNumeric(24);
  const socialAccount = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: account.id,
      provider,
      social_id: socialId,
    } satisfies IAttendanceSocialAccount.ICreate,
  });
  typia.assert(socialAccount);

  // 3. 동일 provider/social_id 조합으로 재등록 시도 -> 409 Conflict 발생 확인
  await TestValidator.error("동일 provider/social_id 중복 등록 시 409 에러 발생")(() =>
    api.functional.attendance.auth.socialAccounts.post(connection, {
      body: {
        auth_account_id: account.id,
        provider,
        social_id: socialId,
      } satisfies IAttendanceSocialAccount.ICreate,
    })
  );
}