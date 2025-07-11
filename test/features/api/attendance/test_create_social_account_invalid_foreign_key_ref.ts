import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 소셜 계정 매핑 생성의 잘못된 입력 유효성 검사(E2E 에러 케이스)
 *
 * 존재하지 않는 auth_account_id, 허용되지 않은 provider 값, 부적절한 social_id 포맷 등이 입력된 경우
 * API가 적절한 422(혹은 400) Validation 에러를 반환하는지 각 케이스별로 테스트합니다.
 *
 * [검증케이스]
 * 1. 존재하지 않는(랜덤 UUID) auth_account_id로 요청 → 외래키 제약 위반
 * 2. provider 값에 허용되지 않은 문자열 입력(예: 'facebook')
 * 3. social_id에 비정상 포맷(ex: 너무 짧거나 특수문자 다수 등)
 */
export async function test_api_attendance_auth_socialAccounts_post_invalid_foreign_key_ref(connection: api.IConnection) {
  // 1. 존재하지 않는 auth_account_id 사용(랜덤 UUID)
  await TestValidator.error("존재하지 않는 auth_account_id 외래키 제약 에러")(async () => {
    await api.functional.attendance.auth.socialAccounts.post(connection, {
      body: {
        auth_account_id: typia.random<string & tags.Format<"uuid">>(),
        provider: "google",
        social_id: "valid_social_id_321",
      } satisfies IAttendanceSocialAccount.ICreate,
    });
  });

  // 2. provider 값에 허용되지 않은 임의 문자열(예시: facebook 등)
  await TestValidator.error("허용되지 않은 provider 값 에러")(async () => {
    await api.functional.attendance.auth.socialAccounts.post(connection, {
      body: {
        auth_account_id: typia.random<string & tags.Format<"uuid">>(),
        provider: "facebook",
        social_id: "valid_social_id_654",
      } satisfies IAttendanceSocialAccount.ICreate,
    });
  });

  // 3. social_id에 부적절한 포맷 입력(너무 짧거나 특수문자 포함)
  await TestValidator.error("비정상 포맷의 social_id 유효성 에러")(async () => {
    await api.functional.attendance.auth.socialAccounts.post(connection, {
      body: {
        auth_account_id: typia.random<string & tags.Format<"uuid">>(),
        provider: "google",
        social_id: "@@",
      } satisfies IAttendanceSocialAccount.ICreate,
    });
  });
}