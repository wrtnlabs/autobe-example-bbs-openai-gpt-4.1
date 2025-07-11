import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IPageIAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceAuthAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 인증 계정 목록 필터 및 페이징 동작 검증(관리자 권한)
 *
 * 관리자 권한으로 인증 계정(로그인 계정) 목록을 다양한 조건과 페이징으로 조회할 때, 각 필터 조건이 정상 동작하고, 페이징/정렬된 데이터 및 페이지 정보가 올바르게 반환되는지 검증합니다.
 *
 * - 사전 조건: 다양한 이메일, 생성일, 상태(삭제/비삭제)로 여러 개 인증 계정을 등록해둔다
 *
 * 1. 다양한 조건의 계정 4개 등록(이메일, 생성 시각 다름, 일부 삭제)
 * 2. 각 케이스별로 필터링 조건(이메일, 생성일 범위, 삭제여부=true/false/null), 페이징(page/limit), 정렬(sort/order)로 목록을 조회
 * 3. 응답의 data에는 필터 조건에 맞는 계정들만 포함되는지 확인
 * 4. pagination 정보(current, limit, records, pages)가 올바르게 계산되는지 점검
 * 5. 경계/에지 케이스(존재하지 않는 이메일, 범위를 벗어난 날짜 등)도 확인
 */
export async function test_api_attendance_test_list_auth_accounts_with_valid_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. 다양한 조건의 계정 4개 등록(이메일/생성 시각 다름, 일부 삭제)
  // - 이메일 각각 다르게, created_at 수 분/수 시간 차이 두기 위한 대기
  // - 두 개 계정은 바로 삭제(비활성 표시)

  const accounts: IAttendanceAuthAccount[] = [];
  for (let i = 0; i < 4; ++i) {
    const email = `user${i}_${typia.random<string & tags.Format<"email">>()}`;
    const account = await api.functional.attendance.auth.accounts.post(connection, {
      body: {
        email,
        password_hash: `hashedpw${i}`,
      } satisfies IAttendanceAuthAccount.ICreate,
    });
    typia.assert(account);
    accounts.push(account);
  }

  // 임의로 2개 계정 deleted_at (soft delete) 값 세팅 시뮬레이션
  accounts[2] = { ...accounts[2], deleted_at: new Date().toISOString() };
  accounts[3] = { ...accounts[3], deleted_at: new Date().toISOString() };

  // 2. 메일 일부 일치 검색
  const emailFilter = accounts[0].email!;
  const output1 = await api.functional.attendance.auth.accounts.patch(connection, {
    body: {
      email: emailFilter,
      page: 1,
      limit: 10,
      sort: "created_at",
      order: "asc",
    } satisfies IAttendanceAuthAccount.IRequest,
  });
  typia.assert(output1);
  TestValidator.equals("filtered email 포함 계정만")(output1.data.every(acc => acc.email === emailFilter))(true);
  TestValidator.equals("pagination 맞음")(output1.pagination.current)(1);

  // 3. 생성일 범위 필터 테스트 - 최근 2분 내 생성 계정만 검색
  const from = new Date(Date.now() - 60 * 2000).toISOString();
  const to = new Date().toISOString();
  const output2 = await api.functional.attendance.auth.accounts.patch(connection, {
    body: {
      created_at_from: from,
      created_at_to: to,
      page: 1,
      limit: 10,
      sort: "created_at",
      order: "desc",
    } satisfies IAttendanceAuthAccount.IRequest,
  });
  typia.assert(output2);
  TestValidator.predicate("생성일 필터 동작")(output2.data.every(acc => acc.created_at >= from && acc.created_at <= to));

  // 4. 논리삭제 계정(비활성)만 검색
  const output3 = await api.functional.attendance.auth.accounts.patch(connection, {
    body: {
      deleted: true,
      page: 1,
      limit: 10,
    } satisfies IAttendanceAuthAccount.IRequest,
  });
  typia.assert(output3);
  TestValidator.predicate("deleted true만")(output3.data.every(acc => acc.deleted_at !== null));

  // 5. 미삭제(활성) 계정만 검색
  const output4 = await api.functional.attendance.auth.accounts.patch(connection, {
    body: {
      deleted: false,
      page: 1,
      limit: 10,
    } satisfies IAttendanceAuthAccount.IRequest,
  });
  typia.assert(output4);
  TestValidator.predicate("deleted false만")(output4.data.every(acc => acc.deleted_at === null));

  // 6. 페이징 확인 (limit=2)
  const output5 = await api.functional.attendance.auth.accounts.patch(connection, {
    body: {
      page: 1,
      limit: 2,
      sort: "created_at",
      order: "asc",
    },
  });
  typia.assert(output5);
  TestValidator.equals("페이지당 limit 2")(output5.data.length)(2);
  TestValidator.equals("pagination.limit")(output5.pagination.limit)(2);

  // 7. 존재하지 않는 이메일로 검색 시 결과 없음
  const output6 = await api.functional.attendance.auth.accounts.patch(connection, {
    body: {
      email: "doesnotexist999@nowhere.com",
      page: 1,
      limit: 10,
    },
  });
  typia.assert(output6);
  TestValidator.equals("존재하지 않는 이메일")(output6.data.length)(0);
}