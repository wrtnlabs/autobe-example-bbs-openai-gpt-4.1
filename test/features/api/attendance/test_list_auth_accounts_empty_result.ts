import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IPageIAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceAuthAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 엄격한 필터를 사용한 인증 계정 리스트 빈 결과 검증
 *
 * 존재하지 않는 이메일(실제로 시스템에 등록될 수 없는 랜덤 문자열) 등을 이용해 인증 계정 목록을 조회했을 때,
 * 결과의 data 배열이 빈 배열([])로 반환되며 pagination(페이지네이션 메타 정보)이 정상적으로 포함되는지 검증합니다.
 *
 * 검증 포인트:
 * 1. 실제 생성 불가한 무작위 이메일을 사용해 인증 계정 목록 API를 조회
 * 2. 반환된 data 필드가 빈 배열([])인지 검증
 * 3. pagination 필드의 필수 정보(current, limit, records, pages)가 모두 존재하고 타입이 올바른지 체크
 * 4. 예외/오류가 발생하지 않아야 함
 */
export async function test_api_attendance_test_list_auth_accounts_empty_result(
  connection: api.IConnection,
) {
  // 1. 실제로 존재 불가한 무작위 이메일 생성(필터 조건)
  const impossibleEmail: string = `${RandomGenerator.alphabets(16)}-noexist@example.com`;

  const requestBody: IAttendanceAuthAccount.IRequest = {
    email: impossibleEmail,
    page: 1,
    limit: 7,
    sort: "created_at",
    order: "desc",
  };

  // 2. 인증 계정 목록 API 조회
  const output = await api.functional.attendance.auth.accounts.patch(connection, {
    body: requestBody,
  });
  typia.assert(output);

  // 3. data가 반드시 빈 배열임을 검증
  TestValidator.equals("data is empty")(output.data.length)(0);

  // 4. pagination의 필수 필드가 정상적으로 모두 존재하고 타입도 일치하는지 검증
  const pagination = output.pagination;
  const keys = ["current", "limit", "records", "pages"] as const;
  for (const key of keys) {
    TestValidator.predicate(`pagination has '${key}' field`)(pagination.hasOwnProperty(key));
    TestValidator.predicate(`pagination.${key} is number`)(typeof pagination[key] === "number");
  }
}