import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 소셜 계정 매핑 정보 수정(정상 케이스) 테스트.
 *
 * 소유자 또는 관리자가 기존 소셜 계정 매핑(attendance_social_account) row의 정보를 변경하는 시나리오다.
 * provider/social_id 유니크 제약에 위배되지 않는 조합으로, auth_account_id, provider, social_id를 정상 수정할 때,
 * 변경 결과가 응답에 올바르게 반영되는지, FK(새로운 auth_account) 제약도 함께 검증한다.
 *
 * 1. 업데이트용 인증계정 생성
 * 2. 원본 소셜 계정 매핑 생성 (수정 대상)
 * 3. 실제로 수정할 신규 인증 계정 생성
 * 4. putById로 소셜 계정 매핑 row 수정 (auth_account_id, provider, social_id 동시 변경)
 * 5. 응답 값이 기대값과 일치하는지(정상 반영·FK 연결) 검증
 */
export async function test_api_attendance_test_update_social_account_mapping_success(
  connection: api.IConnection,
) {
  // 1. 업데이트용 인증계정 생성
  const baseAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>()
    },
  });
  typia.assert(baseAccount);

  // 2. 수정 대상 소셜 계정 매핑 생성 (원본 데이터)
  const originalSocial = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: baseAccount.id,
      provider: 'google',
      social_id: typia.random<string>(),
    },
  });
  typia.assert(originalSocial);

  // 3. 실제로 변경할 인증 계정 생성
  const updateAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>()
    },
  });
  typia.assert(updateAccount);

  // 4. 소셜 계정 매핑 row 정보 수정 (auth_account_id, provider, social_id 동시 변경)
  const nextProvider = 'kakao';
  const nextSocialId = typia.random<string>();
  const updated = await api.functional.attendance.auth.socialAccounts.putById(connection, {
    id: originalSocial.id,
    body: {
      auth_account_id: updateAccount.id,
      provider: nextProvider,
      social_id: nextSocialId,
    },
  });
  typia.assert(updated);

  // 5. 응답 필드가 기대값과 일치하는지 확인 (수정 반영 및 FK 정상성 검증)
  TestValidator.equals('auth_account_id')(updated.auth_account_id)(updateAccount.id);
  TestValidator.equals('provider')(updated.provider)(nextProvider);
  TestValidator.equals('social_id')(updated.social_id)(nextSocialId);
}