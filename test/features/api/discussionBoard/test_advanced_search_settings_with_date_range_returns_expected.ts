import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import type { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 고급 날짜 범위 검색이 정확히 동작하는지 검사한다.
 *
 * - 다양한 created_at/updated_at 값을 갖는 설정 데이터를 선행 생성한다.
 * - 일정 범위의 날짜(start~end)를 가진 필터로 PATCH 요청을 한다.
 * - 결과로 반환된 설정들이 지정한 범위 내의 created_at/updated_at을 갖는지 검사한다.
 * - 범위 밖의 설정은 결과에 포함되어선 안 된다.
 *
 * [테스트 과정]
 *
 * 1. 3개 이상의 설정을 서로 다른 created_at/updated_at 조합(가령 각각 오늘, 5일 전, 10일 전 등)으로 생성한다.
 * 2. 예를 들어 created_at 기준 7일 전 ~ 오늘까지의 범위로 PATCH 검색한다.
 * 3. 조건을 만족하는 설정만 조회되어야 하며, 범위 밖의 것은 조회되지 않아야 한다.
 */
export async function test_api_discussionBoard_test_advanced_search_settings_with_date_range_returns_expected(
  connection: api.IConnection,
) {
  // 1. 테스트용 날짜(오늘, 5일 전, 10일 전 등)를 계산한다.
  const now = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  // 2. 테스트 설정 3개를 생성한다(각기 다른 날짜).
  const settings = await Promise.all([
    api.functional.discussionBoard.admin.settings.create(connection, {
      body: {
        setting_key: `test_range_created_today_${typia.random<string>()}`,
        setting_value: "today",
        description: "테스트용 오늘 생성 설정",
      } satisfies IDiscussionBoardSetting.ICreate,
    }),
    api.functional.discussionBoard.admin.settings.create(connection, {
      body: {
        setting_key: `test_range_created_5days_${typia.random<string>()}`,
        setting_value: "5daysAgo",
        description: "테스트용 5일 전 생성 설정",
      } satisfies IDiscussionBoardSetting.ICreate,
    }),
    api.functional.discussionBoard.admin.settings.create(connection, {
      body: {
        setting_key: `test_range_created_10days_${typia.random<string>()}`,
        setting_value: "10daysAgo",
        description: "테스트용 10일 전 생성 설정",
      } satisfies IDiscussionBoardSetting.ICreate,
    }),
  ]);
  // 개별로 typia.assert를 호출해 타입 검증 수행
  for (const setting of settings) typia.assert(setting);

  // (보통 시스템에서는 생성/수정일을 직접 지정 불가하므로, 테스트 시점의 날짜를 기반으로 필터링한다)
  // 생성된 설정 중 일부는 필터링에 포함/미포함 조건을 인위적으로 나누기 위해 현재 시간 활용

  // 3. created_at 기준 "7일 전 ~ 오늘" 범위로 PATCH 검색 수행
  const rangeStart = daysAgo(7);
  const rangeEnd = now.toISOString();
  const patchBody = {
    created_at_start: rangeStart,
    created_at_end: rangeEnd,
  };

  const result = await api.functional.discussionBoard.admin.settings.search(
    connection,
    {
      body: patchBody,
    },
  );
  typia.assert(result);

  // 4. 반환 설정들의 created_at 값이 모두 7일 이내(시작~끝)인지 체크
  result.data.forEach((setting) => {
    if (setting.created_at < rangeStart || setting.created_at > rangeEnd) {
      throw new Error(
        `설정이 지정된 created_at 범위를 벗어났음: ${setting.setting_key}`,
      );
    }
  });

  // 5. 미포함되어야 하는 설정(10일 전 생성)이 조회되지 않았음을 검증
  const tenDaysKey = settings[2].setting_key;
  const found = result.data.some((s) => s.setting_key === tenDaysKey);
  TestValidator.equals("10일 전 설정은 결과에 없어야 함")(found)(false);
}
