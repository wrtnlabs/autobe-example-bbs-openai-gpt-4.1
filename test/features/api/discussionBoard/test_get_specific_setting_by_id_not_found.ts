import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * 존재하지 않는 설정 ID로 관리자 설정을 조회할 때, Not Found 에러가 발생함을 검증합니다.
 *
 * - 관리자는 특정 세팅 레코드(설정 ID 기반) 상세 정보 조회가 가능합니다.
 * - 만약 해당 ID 값이 실제 존재하지 않는 UUID이면, 서버는 404(데이터 없음) 에러를 반환해야 하며, 어떠한 정보나 데이터 노출도
 *   없어야 합니다.
 *
 * [테스트 절차]
 *
 * 1. 무작위(임의의, 실존하지 않는) UUID를 생성합니다.
 * 2. 해당 UUID로 GET /discussionBoard/admin/settings/:settingId를 호출합니다.
 * 3. 반드시 Not Found(404) 등 예외가 발생하는지, 정상적인 데이터가 반환되지 않는지 검증합니다.
 */
export async function test_api_discussionBoard_test_get_specific_setting_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. 임의(실존하지 않는) UUID 생성
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 2. 비존재 설정 ID로 조회 시도 후, 반드시 에러가 발생해야 함을 검증
  await TestValidator.error(
    "not found error for non-existent discussion board setting ID",
  )(async () => {
    await api.functional.discussionBoard.admin.settings.at(connection, {
      settingId: nonExistentId,
    });
  });
}
