import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 소셜 계정과 내부 인증 계정 매핑 성공 생성 검증 테스트.
 *
 * 관리자 또는 본인 인증 상태에서 provider/social_id/auth_account_id 조합으로 소셜 계정 매핑을 성공적으로 생성할 수 있어야 합니다.
 *
 * 1. 신규 인증계정(auth_account) 생성
 * 2. 해당 계정의 id를 사용하여 provider/social_id 조합으로 소셜 계정 매핑 생성 요청
 * 3. 응답으로 반환되는 소셜 계정 매핑 Row가 입력 정보와 정확히 일치하는지 검증
 *  - auth_account_id가 존재하는 값임을 검증
 *  - provider/social_id 유니크 제약, FK 제약이 유효함을 검증(정상 생성)
 */
export async function test_api_attendance_test_create_social_account_mapping_success(
  connection: api.IConnection,
) {
  // 1. 인증계정 생성
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(40),
    },
  });
  typia.assert(authAccount);

  // 2. provider/social_id 조합 및 FK id로 소셜 계정 매핑 생성
  const provider = RandomGenerator.pick(["google", "naver", "kakao"]);
  const socialId = RandomGenerator.alphaNumeric(30);
  const socialAccount = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: authAccount.id,
      provider,
      social_id: socialId,
    },
  });
  typia.assert(socialAccount);

  // 3. 반환 값의 데이터 일치 검증
  TestValidator.equals("auth_account_id 일치")(socialAccount.auth_account_id)(authAccount.id);
  TestValidator.equals("provider 일치")(socialAccount.provider)(provider);
  TestValidator.equals("social_id 일치")(socialAccount.social_id)(socialId);
}