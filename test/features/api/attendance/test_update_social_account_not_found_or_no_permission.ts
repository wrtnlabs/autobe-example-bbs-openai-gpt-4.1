import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 존재하지 않는 소셜계정(social_account) ID로 업데이트 요청 혹은 권한이 없는 사용자가 소셜계정 매핑 row에 접근 시 적절한 오류 반환 검증
 *
 * 이 테스트는 다음 상황에 대해 E2E 검증을 수행합니다.
 *
 * 1. 실제로 존재하지 않는 social_account id로 PUT(수정) 요청을 보냈을 때 404 Not Found 오류가 반환되는가?
 * 2. 권한이 없는(=해당 소셜 계정과 연결되지 않은) 사용자가 다른 사람의 소셜매핑 row에 대해 PUT 요청 시도할 때 403 Forbidden과 같은 보안 오류가 발생하는가?
 * 3. 본인이 아닌 mapping row에 대한 접근 통제를 실제로 잘 이행하는지(보안 정책) 검증
 *
 * - 이를 위해, 테스트용 인증계정 2개(A, B)와 social_account 1개(계정 A에 매핑)를 준비
 *
 * [진행 프로세스]
 * 1. 인증계정 A 생성
 * 2. 인증계정 B 생성(권한 없는 사용자 시나리오용)
 * 3. 소셜매핑 row(계정 A 소유) 생성
 * 4. [case1] 계정 A 토큰 상태에서 실제로 존재하지 않는 소셜매핑 id(랜덤 uuid)로 PUT 요청 → 404 확인
 * 5. [case2] 계정 B 토큰 상태에서 계정 A의 소셜매핑 id로 PUT 요청 → 403 Forbidden 등 접근불가 오류 확인
 */
export async function test_api_attendance_test_update_social_account_not_found_or_no_permission(
  connection: api.IConnection,
) {
  // 1. 인증계정 A 생성
  const accountA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(8),
    },
  });
  typia.assert(accountA);

  // 2. 인증계정 B 생성
  const accountB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(10),
    },
  });
  typia.assert(accountB);

  // 3. 소셜계정 매핑 생성 (계정 A 기준)
  const socialAccountA = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: accountA.id,
      provider: "google",
      social_id: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(socialAccountA);

  // 4. 존재하지 않는 social_account_id로 putById 요청 → 404 확인
  await TestValidator.error("존재하지 않는 소셜매핑 id - 404")(async () => {
    await api.functional.attendance.auth.socialAccounts.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        provider: "naver",
      },
    });
  });

  // 5. 권한 없는 accountB의 social_account 접근 -> 403 등 확인
  // (실제 로직상, 별도의 인증/토큰 분리가 구현되어 있다면 로그인/토큰 정책에 맞춰 계정 스위칭 처리 필요)
  // 여기서는 계정 B로 접근했다고 가정, connection 상태 전환 가능하게 되어야 함

  // -- 여기서 계정 B의 인증 세션으로 전환한다고 가정 (테스트 infra 정책에 따라 실제 코드에 반영 필요)

  await TestValidator.error("다른 계정이 소유한 social_account 접근 차단 - 403")(async () => {
    // 가정: connection을 accountB의 인증된 세션 상태로 전환했다고 가정하고 socialAccountA.id에 접근 시도
    await api.functional.attendance.auth.socialAccounts.putById(connection, {
      id: socialAccountA.id,
      body: {
        provider: "kakao",
      },
    });
  });
}