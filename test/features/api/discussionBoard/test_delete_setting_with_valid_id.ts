import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * 테스트 목적: Admin 권한으로 특정 Discussion Board Setting을 삭제하는 기능 검증.
 *
 * 비즈니스 컨텍스트 및 중요성: 운영중인 토론 게시판의 설정을 시스템에서 완전히 제거(하드 딜리트)하는 것은 관리상 꼭 필요한 기능임.
 * 정상적으로 삭제되면 더 이상 해당 설정을 조회(읽기)할 수 없어야 하고, 삭제 이벤트는 운영 추적을 위해 감사(log)에 반드시 저장되어야
 * 함.
 *
 * 테스트 프로세스:
 *
 * 1. (사전 준비) 관리자가 Discussion Board Setting을 생성함 (setting_key/setting_value 지정)
 * 2. (주행) 방금 생성된 Setting의 id로 삭제 API를 호출해 hard delete 시도
 * 3. (검증1) 반환값이 없고, 삭제 후 동일 id로 setting을 재삭제하면 실패(에러 발생)함을 검증
 * 4. (검증2) 존재하지 않는 id로 삭제 요청시 에러 검증
 *
 * 이 테스트는 제공 자료상 가능한 경계조건, 정상/비정상 경로를 완전하게 검증.
 */
export async function test_api_discussionBoard_test_delete_setting_with_valid_id(
  connection: api.IConnection,
) {
  // 1. 관리자 권한으로 신규 Discussion Board Setting을 만듦
  const settingInput: IDiscussionBoardSetting.ICreate = {
    setting_key: `auto_test_setting_${RandomGenerator.alphaNumeric(8)}`,
    setting_value: RandomGenerator.paragraph()(1),
    description: RandomGenerator.paragraph()(1),
  };
  const createdSetting =
    await api.functional.discussionBoard.admin.settings.create(connection, {
      body: settingInput,
    });
  typia.assert(createdSetting);

  // 2. 방금 생성한 id로 삭제(하드딜리트) 수행
  await api.functional.discussionBoard.admin.settings.erase(connection, {
    settingId: createdSetting.id,
  });

  // 3. 이미 삭제한 id로 재삭제하면 반드시 실패(에러 반환)
  await TestValidator.error(
    "already deleted setting should not be deleted twice",
  )(() =>
    api.functional.discussionBoard.admin.settings.erase(connection, {
      settingId: createdSetting.id,
    }),
  );

  // 4. 아예 존재하지 않는 id로 삭제 요청 시도 역시 에러로 처리되는지 검증
  await TestValidator.error("nonexistent setting id delete fails")(() =>
    api.functional.discussionBoard.admin.settings.erase(connection, {
      settingId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );
}
