import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * 테스트 목적: 관리자(admin) 레코드가 존재하지 않을 때 관리자 목록 조회 API의 정상 동작 검증
 *
 * 시나리오 개요:
 *
 * - 시스템에 등록된 discussion board 관리자가 하나도 없는 상태에서 전체 관리자 목록을 조회합니다.
 *
 * 상세 절차:
 *
 * 1. (사전조건) 시스템 내 관리자(admin) 레코드가 전혀 없는 상태(클린 환경)임을 가정합니다.
 * 2. 관리자 목록 전체 조회 API (GET /discussionBoard/admin/admins)를 호출합니다.
 * 3. 반환 결과의 pagination.records 값이 0임을 검증합니다.
 * 4. 반환 결과의 data 배열이 빈 배열임을 검증합니다.
 *
 * 기대 효과:
 *
 * - 관리자가 전혀 없는 환경에서 호출 시 빈 배열 및 레코드 카운트 0이 확실하게 반환됨을 보장합니다.
 */
export async function test_api_discussionBoard_test_list_all_admins_no_records(
  connection: api.IConnection,
) {
  // 1. (사전조건) 관리자가 전혀 없는 환경(이 테스트만 단독 실행)

  // 2. 관리자 목록 전체 조회 API 호출
  const output =
    await api.functional.discussionBoard.admin.admins.index(connection);
  typia.assert(output);

  // 3. pagination.records가 0인지 검증
  TestValidator.equals("pagination.records = 0")(output.pagination.records)(0);

  // 4. data가 빈 배열인지 검증
  TestValidator.equals("admin data is empty")(output.data)([]);
}
