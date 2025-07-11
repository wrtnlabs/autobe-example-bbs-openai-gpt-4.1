import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 존재하지 않는 UUID 또는 권한 없는 계정으로 소셜 계정(social_account)을 조회할 때 적절한 에러 코드가 반환되는지 검증한다.
 *
 * - 존재하지 않는(랜덤) UUID 조회 시 404 not found가 반환되어야 하며,
 * - 타 유저가 소셜 계정의 id를 조회 시도할 때 403 forbidden이 반환되어야 한다.
 *
 * 단, 현재 제공 API 도구에서는 로그인/토큰 인증 전환 등 계정 컨텍스트 변경 API가 없어, 실제 코드로 구현 가능한 것은 404 케이스(존재하지 않는 UUID)뿐이다.
 * 403 forbidden 케이스(타 계정 접근)는 시나리오 설명과 주석으로만 표시한다.
 *
 * [테스트 Step]
 * 1. 인증계정 A 생성 : accounts.post
 * 2. 소셜 계정 row 생성(계정 A 연결) : socialAccounts.post
 * 3. 인증계정 B 생성(권한 없는 계정 시나리오용) : accounts.post
 * 4. 존재하지 않는 UUID(랜덤)로 socialAccounts.getById 호출 → TestValidator.error()로 404 not found 등 에러 반환 확인
 * 5. (불가구현) B 계정이 A의 social_account_id로 조회 시도 → 403 forbidden 에러(주석만 기술, 실제 전환 불가)
 */
export async function test_api_attendance_test_get_social_account_detail_not_found_or_forbidden(
  connection: api.IConnection,
) {
  // 1. 인증계정 A 생성
  const authAccountA = await api.functional.attendance.auth.accounts.post(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: typia.random<string>(),
      },
    },
  );
  typia.assert(authAccountA);

  // 2. 계정 A에 소셜 계정 row 등록
  const socialAccountA = await api.functional.attendance.auth.socialAccounts.post(
    connection,
    {
      body: {
        auth_account_id: authAccountA.id,
        provider: "google",
        social_id: typia.random<string>(),
      },
    },
  );
  typia.assert(socialAccountA);

  // 3. 인증계정 B 생성(권한 없는 계정)
  const authAccountB = await api.functional.attendance.auth.accounts.post(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: typia.random<string>(),
      },
    },
  );
  typia.assert(authAccountB);

  // 4. 존재하지 않는 UUID로 socialAccounts.getById 요청 → 404 not found 등 에러 발생 검증
  await TestValidator.error("존재하지 않는 social_account id 조회 시 404 not found 등의 에러 발생")(async () => {
    await api.functional.attendance.auth.socialAccounts.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 5. (불가구현) 계정 B가 A의 social_account_id를 조회 시도 => 403 forbidden 케이스 설계상 필요하나, 실제 계정 context 전환 API가 없어 미구현
  //   예시:
  //   await TestValidator.error("타 유저가 소셜 계정 id 접근 시 403 forbidden")(async () => {
  //     // connection context를 authAccountB로 전환 후 조회 시도. 실제 전환 API 없음.
  //     await api.functional.attendance.auth.socialAccounts.getById(connection, { id: socialAccountA.id });
  //   });
}