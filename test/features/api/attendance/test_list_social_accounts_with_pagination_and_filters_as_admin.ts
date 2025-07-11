import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";
import type { IPageIAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceSocialAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자 권한으로 소셜 계정 매핑(attendance_social_account)의 목록을 페이징, 검색, 필터로 조회하고 비즈니스 로직 및 pagination을 검증합니다.
 *
 * - provider(소셜 플랫폼명), social_id(외부 사용자ID), auth_account_id(내부 인증계정ID)로 각각 정상적으로 필터링되는지 검증합니다.
 * - limit(페이지 크기), page(페이지 번호) 등 pagination 옵션이 메타에 반영되고 올바른 개수 및 예상 records/pages/current 값이 반환되는지 확인합니다.
 * - 조건에 맞는 데이터가 없을 때 빈 리스트, pagination 메타(전체레코드수/페이지 등)도 올바르게 동작해야 함을 검증합니다.
 *
 * 사전 데이터 준비:
 *  1) 인증 계정 2개 생성 (POST /attendance/auth/accounts)
 *  2) 각 계정에 대해 provider/social_id 조합을 다르게 한 소셜 계정 2개 생성 (POST /attendance/auth/socialAccounts)
 *
 * 테스트 단계:
 * 1. 인증 계정 2개 생성 (각각 email, password_hash 랜덤)
 * 2. provider/social_id/auth_account_id 조합을 다르게 한 소셜 계정 2개 생성
 * 3. 전체조회 → 2개 이상 존재, pagination.records 등 메타 확인
 * 4. provider로 filter → 1개만, provider & social_id 일치 확인
 * 5. 각각의 social_id / auth_account_id로 filter → 개별 1개, 필드 일치
 * 6. limit 옵션(1)로 조회해서 페이지 크기, meta.limit 일치 확인
 * 7. page 2로 조회(데이터 없거나, 1개 반환시 id 다름까지 체크)
 * 8. 존재하지 않는 provider/social_id/auth_account_id 조합 조회시 빈 result 및 pagination meta.records = 0 확인
 */
export async function test_api_attendance_test_list_social_accounts_with_pagination_and_filters_as_admin(
  connection: api.IConnection,
) {
  // 1. 인증계정 2개 생성
  const authAccount1 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "HASHED_PASSWORD_1"
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(authAccount1);
  const authAccount2 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "HASHED_PASSWORD_2"
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(authAccount2);

  // 2. 소셜 계정 2개 생성(각 provider/social_id/auth_account_id 다르게)
  const social1 = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: authAccount1.id,
      provider: "google",
      social_id: "google-user-1"
    } satisfies IAttendanceSocialAccount.ICreate
  });
  typia.assert(social1);
  const social2 = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: authAccount2.id,
      provider: "kakao",
      social_id: "kakao-user-2"
    } satisfies IAttendanceSocialAccount.ICreate
  });
  typia.assert(social2);

  // 3. 전체조회(필터 없음)
  const allAccounts = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: {} as IAttendanceSocialAccount.IRequest
  });
  typia.assert(allAccounts);
  TestValidator.predicate("at least 2 social accounts exist")(allAccounts.data.length >= 2);
  TestValidator.equals("pagination.records equal data length")(allAccounts.pagination.records)(allAccounts.data.length);

  // 4. provider로 필터조회
  const googleList = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: { provider: "google" } satisfies IAttendanceSocialAccount.IRequest
  });
  typia.assert(googleList);
  TestValidator.equals("google provider only")(googleList.data.length)(1);
  TestValidator.equals("provider matched")(googleList.data[0].provider)("google");
  TestValidator.equals("social_id matched")(googleList.data[0].social_id)("google-user-1");

  const kakaoList = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: { provider: "kakao" } satisfies IAttendanceSocialAccount.IRequest
  });
  typia.assert(kakaoList);
  TestValidator.equals("kakao provider only")(kakaoList.data.length)(1);
  TestValidator.equals("provider matched")(kakaoList.data[0].provider)("kakao");
  TestValidator.equals("social_id matched")(kakaoList.data[0].social_id)("kakao-user-2");

  // 5. social_id별 필터조회
  const googleSid = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: { social_id: "google-user-1" } satisfies IAttendanceSocialAccount.IRequest
  });
  typia.assert(googleSid);
  TestValidator.equals("social_id matched google")(googleSid.data.length)(1);
  TestValidator.equals("social_id")(googleSid.data[0].social_id)("google-user-1");

  const kakaoSid = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: { social_id: "kakao-user-2" } satisfies IAttendanceSocialAccount.IRequest
  });
  typia.assert(kakaoSid);
  TestValidator.equals("social_id matched kakao")(kakaoSid.data.length)(1);
  TestValidator.equals("social_id")(kakaoSid.data[0].social_id)("kakao-user-2");

  // 6. auth_account_id 필터조회
  const acc1List = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: { auth_account_id: authAccount1.id } satisfies IAttendanceSocialAccount.IRequest
  });
  typia.assert(acc1List);
  TestValidator.equals("auth_account_id 1 only")(acc1List.data.length)(1);
  TestValidator.equals("auth_account_id 1 matched")(acc1List.data[0].auth_account_id)(authAccount1.id);

  const acc2List = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: { auth_account_id: authAccount2.id } satisfies IAttendanceSocialAccount.IRequest
  });
  typia.assert(acc2List);
  TestValidator.equals("auth_account_id 2 only")(acc2List.data.length)(1);
  TestValidator.equals("auth_account_id 2 matched")(acc2List.data[0].auth_account_id)(authAccount2.id);

  // 7. limit 옵션 테스트
  const limited1 = await api.functional.attendance.auth.socialAccounts.patch(connection, { body: { limit: 1 } });
  typia.assert(limited1);
  TestValidator.equals("limit 1")(limited1.data.length)(1);
  TestValidator.equals("limit meta")(limited1.pagination.limit)(1);

  // 8. page 옵션 테스트 (2페이지 요청 시 1페이지와 다른 데이터 or 빈 배열)
  const page2 = await api.functional.attendance.auth.socialAccounts.patch(connection, { body: { page: 2, limit: 1 } });
  typia.assert(page2);
  TestValidator.equals("page meta")(page2.pagination.current)(2);
  if (page2.data.length === 1) {
    TestValidator.notEquals("page2 and page1 different record")(page2.data[0].id)(limited1.data[0].id);
  } else {
    TestValidator.equals("page2 empty")(page2.data.length)(0);
  }

  // 9. nonexistent provider/social_id/auth_account_id 조회시 empty 결과
  const noProvider = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: { provider: "no-such-provider" } satisfies IAttendanceSocialAccount.IRequest
  });
  typia.assert(noProvider);
  TestValidator.equals("no provider result")(noProvider.data.length)(0);
  TestValidator.equals("pagination meta reflect empty")(noProvider.pagination.records)(0);

  const noSid = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: { social_id: "no-such-id" } satisfies IAttendanceSocialAccount.IRequest
  });
  typia.assert(noSid);
  TestValidator.equals("no social_id result")(noSid.data.length)(0);
  TestValidator.equals("pagination meta reflect empty")(noSid.pagination.records)(0);

  const noAuth = await api.functional.attendance.auth.socialAccounts.patch(connection, {
    body: { auth_account_id: typia.random<string & tags.Format<"uuid">>() } satisfies IAttendanceSocialAccount.IRequest
  });
  typia.assert(noAuth);
  TestValidator.equals("no auth_account_id result")(noAuth.data.length)(0);
  TestValidator.equals("pagination meta reflect empty")(noAuth.pagination.records)(0);
}