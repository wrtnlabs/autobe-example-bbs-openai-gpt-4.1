import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 관리자에 의한 활동 로그(activity log) 메타데이터 수정 시나리오 검증
 *
 * 관리자(admin) 권한으로 기존 액티비티 로그 엔트리의 메타데이터(예: 추가/수정된 메타데이터, User-Agent, IP) 정보를
 * 업데이트하고, 응답 데이터에 변경사항이 반영되는지 확인합니다. id, actor_id 등 불변 데이터의 일관성도 함께 검증합니다.
 *
 * 1. 테스트용 activity log 레코드를 생성한다.
 * 2. 만들어진 레코드의 주요 수정 가능 필드(ip_address, user_agent, metadata_json, action_type 등)를
 *    변경한다.
 * 3. 응답에서 변경 필드와 불변 필드(id 등)의 반영 여부를 확인한다.
 * 4. (확장) 추가적 감사 이벤트/이력 관련 API가 있을 경우는 별도 테스트에서 다룸
 */
export async function test_api_discussionBoard_admin_activityLogs_test_update_activity_log_with_valid_metadata_by_admin(
  connection: api.IConnection,
) {
  // 1. 활동 로그 엔트리 생성 (선행: 업데이트 대상 준비)
  const createInput: IDiscussionBoardActivityLog.ICreate = {
    actor_id: typia.random<string & tags.Format<"uuid">>(),
    actor_type: "admin",
    action_type: "moderation_action",
    action_timestamp: new Date().toISOString(),
    ip_address: null,
    user_agent: null,
    metadata_json: null,
  };
  const createdLog =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: createInput,
    });
  typia.assert(createdLog);

  // 2. 기존 로그의 주요 필드 수정 (ip_address, user_agent, metadata_json, action_type)
  const updateInput: IDiscussionBoardActivityLog.IUpdate = {
    ip_address: "203.0.113.5",
    user_agent: "unit-test-agent/1.0 (test)",
    metadata_json: JSON.stringify({
      reason: "correction",
      field: "user_agent/ip",
    }),
    action_type: "audit_log_metadata_correction",
  };
  const updatedLog =
    await api.functional.discussionBoard.admin.activityLogs.update(connection, {
      activityLogId: createdLog.id,
      body: updateInput,
    });
  typia.assert(updatedLog);

  // 3. 변경 필드 반영 여부 확인
  TestValidator.equals("ip_address updated")(updatedLog.ip_address)(
    updateInput.ip_address,
  );
  TestValidator.equals("user_agent updated")(updatedLog.user_agent)(
    updateInput.user_agent,
  );
  TestValidator.equals("metadata_json updated")(updatedLog.metadata_json)(
    updateInput.metadata_json,
  );
  TestValidator.equals("action_type updated")(updatedLog.action_type)(
    updateInput.action_type,
  );

  // 4. id, actor_id 등 불변 필드가 유지됐는지 확인
  TestValidator.equals("id unchanged")(updatedLog.id)(createdLog.id);
  TestValidator.equals("actor_id unchanged")(updatedLog.actor_id)(
    createdLog.actor_id,
  );
  TestValidator.equals("actor_type unchanged")(updatedLog.actor_type)(
    createdLog.actor_type,
  );
  // action_timestamp는 변경 input에 포함하지 않아야 불변 확인 가능 / 타입 체크
  TestValidator.predicate("action_timestamp valid")(
    typeof updatedLog.action_timestamp === "string" &&
      updatedLog.action_timestamp.length > 0,
  );
  // (확장) 시스템 감사지원 추가 API 존재 시 별도 검증 추가
}
