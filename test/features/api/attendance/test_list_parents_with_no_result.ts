import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IPageAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceParent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 존재하지 않는 조건으로 학부모 검색 결과 검증.
 *
 * 실존하지 않는 이름 혹은 이메일 등으로 학부모(보호자) 리스트 검색을 요청했을 때,
 * 반드시 결과가 빈 배열([])이며, 페이지네이션 정보(current, limit, records, pages)가
 * 요청값 및 결과 상황(데이터 없음)에 맞게 정확히 표기되는지 검증한다.
 *
 * 이 검증을 위해 사전에 무작위 학부모 데이터를 1개 생성하고,
 * 검색 조건에서는 매칭될 수 없는 특이한 랜덤 문자열을 사용한다.
 *
 * Step-by-step:
 * 1. 학부모 데이터를 1개 생성한다(랜덤, 충돌 없는 값 사용)
 * 2. "존재 불가한 조건"(랜덤 가짜 이름)으로 리스트 검색 요청
 * 3. 결과 data 배열이 빈 값([])임을 확인
 * 4. pagination 객체(current/limit/records/pages) 값이 요청, 결과에 맞게 정상 표기되는지 확인
 */
export async function test_api_attendance_test_list_parents_with_no_result(
  connection: api.IConnection,
) {
  // 1. 학부모(보호자) 데이터 1개 사전 생성
  const createdParent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(createdParent);

  // 2. 매칭 불가능한 랜덤 네임 조건 및 페이지네이션 파라미터 정의
  const nonexistentName = "no-match-" + RandomGenerator.alphaNumeric(16);
  const page = 1;
  const limit = 10;

  // 존재하지 않는 조건(name)으로 학부모 리스트 검색
  const result = await api.functional.attendance.parents.patch(connection, {
    body: {
      name: nonexistentName,
      page,
      limit,
    },
  });
  typia.assert(result);

  // 3. 결과 배열이 빈 값([])인지 판별
  TestValidator.equals("검색 결과 없음")(result.data)([]);

  // 4. 페이지네이션 정보 정상 검증(current, limit, records=0, pages=0)
  TestValidator.equals("current page")(result.pagination.current)(page);
  TestValidator.equals("페이지당 limit")(result.pagination.limit)(limit);
  TestValidator.equals("총 records")(result.pagination.records)(0);
  TestValidator.equals("총 pages")(result.pagination.pages)(0);
}