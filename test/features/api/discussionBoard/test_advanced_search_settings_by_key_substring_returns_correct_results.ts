import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import type { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 고급 설정 키 부분일치 검색 기능을 검증합니다.
 *
 * 1. 서로 다른 키로 몇 가지 설정을 미리 생성합니다 (예: "feature_toggle_A", "theme_option_B",
 *    "theme_option_C", "global_policy_D").
 * 2. 'option'이 포함된 키로만 필터하는 부분일치 검색을 PATCH로 수행합니다.
 * 3. 결과(setting_key들)가 모두 해당 부분 문자열을 포함하는지 검증합니다.
 * 4. Limit=1 페이지네이션 요청시 데이터 1건과 pagination 메타 검증.
 */
export async function test_api_discussionBoard_test_advanced_search_settings_by_key_substring_returns_correct_results(
  connection: api.IConnection,
) {
  // 1. 분명하게 구분되는 키로 설정 데이터 여러 개 생성
  const prefixList = [
    "feature_toggle_A",
    "theme_option_B",
    "theme_option_C",
    "global_policy_D",
  ];
  const createdSettings: IDiscussionBoardSetting[] = [];
  for (const key of prefixList) {
    const setting = await api.functional.discussionBoard.admin.settings.create(
      connection,
      {
        body: {
          setting_key: key,
          setting_value: RandomGenerator.alphaNumeric(8),
          description: `설정 key: ${key}`,
        } satisfies IDiscussionBoardSetting.ICreate,
      },
    );
    typia.assert(setting);
    createdSettings.push(setting);
  }

  // 2. 부분 문자열 'option'이 포함된 설정만 검색
  const substring = "option";
  const searchOutput =
    await api.functional.discussionBoard.admin.settings.search(connection, {
      body: {
        setting_key: substring,
      } satisfies IDiscussionBoardSetting.IRequest,
    });
  typia.assert(searchOutput);

  // 3. 반환된 각 setting_key가 substring을 포함하는지 검증
  for (const item of searchOutput.data) {
    TestValidator.predicate(
      `setting_key에 substring 포함 (${item.setting_key})`,
    )(item.setting_key.includes(substring));
  }
  // 반환 결과 개수 == 기대 filter 개수 비교
  const expectCount = createdSettings.filter((s) =>
    s.setting_key.includes(substring),
  ).length;
  TestValidator.equals("필터 결과 개수 일치")(searchOutput.data.length)(
    expectCount,
  );

  // 4. limit=1로 재검색 → 1개만 반환, 페이지네이션 메타 확인
  const pageOutput = await api.functional.discussionBoard.admin.settings.search(
    connection,
    {
      body: {
        setting_key: substring,
        limit: 1,
        page: 1,
      } satisfies IDiscussionBoardSetting.IRequest,
    },
  );
  typia.assert(pageOutput);
  TestValidator.equals("limit=1 범위 결과 건수")(pageOutput.data.length)(1);
  TestValidator.equals("pagination.limit 일치")(pageOutput.pagination.limit)(1);
  TestValidator.equals("pagination.current 일치")(
    pageOutput.pagination.current,
  )(1);
  TestValidator.equals("pagination.records 일치")(
    pageOutput.pagination.records,
  )(expectCount);
}
