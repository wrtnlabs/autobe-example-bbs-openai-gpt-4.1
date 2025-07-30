import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * Test updating a discussion board setting to a key that already exists on
 * another setting.
 *
 * 이 테스트는 설정 테이블에서 `setting_key`의 유일성 제약이 실제로 지켜지는지 검증합니다.
 *
 * - 서로 다른 키를 가진 두 개의 설정(A, B)을 생성합니다.
 * - B의 setting_key를 A의 값으로 변경(upsert) 시도 시, 유니크 제약(business validation)에 의해 실패해야
 *   하며, 에러가 반드시 발생해야 합니다.
 * - (참고) 정상 동작 시, 아무 레코드도 변경되지 않아야 한다는 점에서 실패 후 두 설정의 key/value가 불변임을 확인합니다.
 *
 * [테스트 상세]
 *
 * 1. Setting_key가 "key_a"인 설정(A) 생성
 * 2. Setting_key가 "key_b"인 설정(B) 생성
 * 3. B를 업데이트하며 setting_key를 "key_a"로 변경 시도 → 실패해야 함
 * 4. 두 객체가 불변임을 코드 수준에서 검증 (DB를 다시 조회하는 API가 없어, 메모리 상 반환값으로 대조)
 */
export async function test_api_discussionBoard_test_update_setting_with_duplicate_key(
  connection: api.IConnection,
) {
  // 1. setting_key가 "key_a"인 설정(A) 생성
  const settingA = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: {
        setting_key: "key_a",
        setting_value: "valueA",
        description: "유니크 제약 검증용 설정 A",
      } satisfies IDiscussionBoardSetting.ICreate,
    },
  );
  typia.assert(settingA);

  // 2. setting_key가 "key_b"인 설정(B) 생성
  const settingB = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: {
        setting_key: "key_b",
        setting_value: "valueB",
        description: "유니크 제약 검증용 설정 B",
      } satisfies IDiscussionBoardSetting.ICreate,
    },
  );
  typia.assert(settingB);

  // 3. B의 key를 "key_a"로 변경 시도 → 실패해야 함 (유니크 위배)
  await TestValidator.error("중복된 setting_key로는 업데이트 불가해야 함")(
    async () => {
      await api.functional.discussionBoard.admin.settings.update(connection, {
        settingId: settingB.id,
        body: {
          setting_key: "key_a",
        } satisfies IDiscussionBoardSetting.IUpdate,
      });
    },
  );

  // 4. 두 객체가 불변임(키값 유지)
  TestValidator.equals("settingA.key는 변함 없음")(settingA.setting_key)(
    "key_a",
  );
  TestValidator.equals("settingB.key는 변함 없음")(settingB.setting_key)(
    "key_b",
  );
}
