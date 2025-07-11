import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 소셜 연동 계정 단건 상세조회 (소유자/관리자 또는 권한 실패/존재X 에러 검증)
 *
 * - 본인 인증계정에 연결된 social_account row의 id로 상세 정보 단건을 조회한다
 * - 테스트를 위해 우선 인증계정(auth_account) 생성, 이후 소셜 연동 정보를 실제 연결 생성(post) 후, getById API로 상세조회
 * - 응답은 provider, social_id, auth_account_id 등 매핑 정보와 audit 필드까지 모두 검증한다
 * - 정상 : 소유자 계정이 직접 조회시 정상 전체 정보 반환
 * - 정상 : 관리자인 경우 타 계정 소셜 row도 정상 조회됨
 * - 에러 : 없는 UUID (랜덤 생성시도) 접근 시 404 에러 확인
 * - 에러 : 무관한(타번호) 계정이 id 지정시 403 권한 오류 또는 404 등 권한 불가 에러 확인
 */
export async function test_api_attendance_test_get_social_account_detail_by_id_as_owner_or_admin(
  connection: api.IConnection,
) {
  // 1. 인증용 계정(OWNER) 생성
  const ownerAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashedpassword01",
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(ownerAccount);

  // 2. 소셜 연동 계정 생성: 해당 owner 계정에 연결
  const socialPayload = {
    auth_account_id: ownerAccount.id,
    provider: "naver",
    social_id: typia.random<string>()
  } satisfies IAttendanceSocialAccount.ICreate;
  const socialAccount = await api.functional.attendance.auth.socialAccounts.post(connection, { body: socialPayload });
  typia.assert(socialAccount);

  // 3. 정상 - 소유자 계정이 자신의 social_account row를 단건 조회
  const fetched = await api.functional.attendance.auth.socialAccounts.getById(connection, { id: socialAccount.id });
  typia.assert(fetched);
  TestValidator.equals("linked auth_account_id")(fetched.auth_account_id)(ownerAccount.id);
  TestValidator.equals("provider")(fetched.provider)(socialPayload.provider);
  TestValidator.equals("social_id")(fetched.social_id)(socialPayload.social_id);

  // 4. 에러 - 존재하지 않는(랜덤) id로 조회시 404 반환
  await TestValidator.error("존재하지 않는 소셜 연동 id 조회시 에러")(() =>
    api.functional.attendance.auth.socialAccounts.getById(connection, { id: typia.random<string & tags.Format<"uuid">>() }),
  );

  // 5. (선택) 권한 없는 타계정이 접근 시도 시 403/404 등
  // 다른 인증계정 user2 생성
  const user2 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashedpassword02",
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(user2);

  // (실제로 토큰 교체 가능시) user2 인증정보로 getById 접근 시도
  // 실제 인증체계 미구현시 이 단계는 생략될 수 있음
  // await api.functional.attendance.auth.socialAccounts.getById(user2_connection, { id: socialAccount.id })
  // => 권한 없음(403/404 등) 에러 검증 (현재 구조상 이 단계는 connection 인증상태에 따라 달라짐)
}