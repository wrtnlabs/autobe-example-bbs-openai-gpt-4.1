import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * 특정 토론 게시판 설정을 Admin 권한으로 UUID로 조회하는 API를 E2E 방식으로 검증합니다.
 *
 * - 관리자가 시스템 내 설정(기능 토글, 정책, 주요 옵션 등)을 생성 후, unique id로 해당 엔터티를 정확히 조회할 수 있는지
 *   확인합니다.
 * - 생성 직후 getBySettingid endpoint로 동일한 id를 fetch하고, 반환된 위치 및 모든 데이터 필드가 등록한 값과
 *   일치함을 보장합니다.
 * - 테스트 대상 필드는 고유키(setting_key), 값(setting_value), description,
 *   생성/수정시각(created_at, updated_at) 전부입니다.
 *
 * [단계 요약]
 *
 * 1. 새로운 설정을 등록한다 (key, value, description 포함)
 * 2. 등록 결과의 id를 회수한다
 * 3. 그 id로 getBySettingid API를 호출해서 정보 일치 여부를 검증한다
 */
export async function test_api_discussionBoard_admin_settings_test_get_specific_setting_by_id_success(
  connection: api.IConnection,
) {
  // 1. 새로운 설정 사전 등록 (unique한 key/value, 랜덤 description)
  const createBody: IDiscussionBoardSetting.ICreate = {
    setting_key: RandomGenerator.alphaNumeric(12),
    setting_value: RandomGenerator.alphaNumeric(24),
    description: RandomGenerator.paragraph()(),
  };
  const created = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(created);

  // 2. 등록된 id 획득 및 유효성
  const createdId = created.id;
  TestValidator.predicate("생성 id 존재")(!!createdId && createdId.length > 0);

  // 3. id로 단건 설정 조회 API 호출
  const fetched = await api.functional.discussionBoard.admin.settings.at(
    connection,
    {
      settingId: createdId,
    },
  );
  typia.assert(fetched);

  // 4. 모든 주요 필드 값과 타임스탬프가 완전히 일치하는지 검증
  TestValidator.equals("id")(fetched.id)(created.id);
  TestValidator.equals("setting_key")(fetched.setting_key)(created.setting_key);
  TestValidator.equals("setting_value")(fetched.setting_value)(
    created.setting_value,
  );
  TestValidator.equals("description")(fetched.description)(created.description);
  TestValidator.equals("created_at")(fetched.created_at)(created.created_at);
  TestValidator.equals("updated_at")(fetched.updated_at)(created.updated_at);
}
