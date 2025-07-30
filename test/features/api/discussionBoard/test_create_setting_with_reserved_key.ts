import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * 테스트: 예약되거나 시스템 특수 키로 설정 생성 시 거부 동작 검증
 *
 * 이 테스트는 게시판 설정 생성 시 비즈니스적으로 보호/예약된(예: 'system_mode') 키를 사용하면 시스템이 적절히 오류를
 * 반환하는지 확인합니다. 일반적으로 이런 키는 관리자/운영만이 직접 조작할 수 있으며, 본 기능은 이를 강제하기 위해 존재합니다. 또한,
 * 시도 자체는 감사 로그에 남아야 하나, 본 테스트에서는 실제 로그 레코드는 검증하지 않습니다.
 *
 * [테스트 시나리오]
 *
 * 1. (가정) 현재 connection은 관리자 인증 상태임
 * 2. 예약/보호 키("system_mode")를 이용해 설정 생성 시도
 * 3. 시스템은 비즈니스 정책 상 해당 키에 대한 생성 요청을 거부해야 함
 * 4. 오류가 발생하며, 정상적인 엔터티가 반환되어서는 안 됨
 */
export async function test_api_discussionBoard_test_create_setting_with_reserved_key(
  connection: api.IConnection,
) {
  // 예약(특수) 키로 설정 생성 시도 → 오류 발생이 정상
  await TestValidator.error("예약 또는 보호된 키 사용 거부 확인")(async () => {
    await api.functional.discussionBoard.admin.settings.create(connection, {
      body: {
        setting_key: "system_mode",
        setting_value: "maintenance",
        description:
          "이 설정 키는 시스템적으로 보호되어 있어 생성이 거부되어야 합니다.",
      },
    });
  });
}
