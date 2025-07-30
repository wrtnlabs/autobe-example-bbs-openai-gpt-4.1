import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 모더레이터 권한 사용자가 활동 로그 엔트리의 user agent, IP address 등의 메타데이터를 수정(정정)할 수 있는지
 * 검증합니다.
 *
 * 주요 단계:
 *
 * 1. 모더레이터가 새로운 활동 로그 엔트리를 생성한다.
 * 2. 로그의 일부 메타데이터(예: IP 주소, user agent, metadata_json)를 변경하여 업데이트한다.
 * 3. 업데이트 요청이 성공적으로 처리되고, 반환된 엔트리에서 변경된 필드만 올바르게 수정되었으며 그 외 필드는 불변임을 검증한다.
 *
 * 비즈니스 목적: 감사 추적/보안 및 통계 로그의 사후 정정 절차의 정확성과 모더레이터 권한 적용을 평가한다.
 */
export async function test_api_discussionBoard_moderator_activityLogs_test_update_activity_log_by_moderator_with_metadata_correction(
  connection: api.IConnection,
) {
  // 1. 활동 로그 신규 생성
  const originalLog =
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      {
        body: {
          actor_id: typia.random<string & tags.Format<"uuid">>(),
          actor_type: "moderator",
          action_type: "moderation_action",
          action_timestamp: new Date().toISOString() as string &
            tags.Format<"date-time">,
          ip_address: "192.168.1.1",
          user_agent: "TestAgent_Old/1.0",
          metadata_json: JSON.stringify({ note: "original" }),
        } satisfies IDiscussionBoardActivityLog.ICreate,
      },
    );
  typia.assert(originalLog);

  // 2. 로그의 일부 필드(IP, user agent, metadata_json 등)을 수정
  const updateFields = {
    ip_address: "203.0.113.22",
    user_agent: "TestAgent_New/2.4",
    metadata_json: JSON.stringify({
      note: "corrected",
      refId: typia.random<string & tags.Format<"uuid">>(),
    }),
  } satisfies IDiscussionBoardActivityLog.IUpdate;
  const updatedLog =
    await api.functional.discussionBoard.moderator.activityLogs.update(
      connection,
      {
        activityLogId: originalLog.id,
        body: updateFields,
      },
    );
  typia.assert(updatedLog);

  // 3. 수정된 필드의 변경 적용 여부 확인
  TestValidator.equals("updated ip address")(updatedLog.ip_address)(
    updateFields.ip_address,
  );
  TestValidator.equals("updated user agent")(updatedLog.user_agent)(
    updateFields.user_agent,
  );
  TestValidator.equals("updated metadata_json")(updatedLog.metadata_json)(
    updateFields.metadata_json,
  );

  // 4. 변경하지 않은 필드는 불변성 확인
  TestValidator.equals("primary key identity")(updatedLog.id)(originalLog.id);
  TestValidator.equals("actor_id unchanged")(updatedLog.actor_id)(
    originalLog.actor_id,
  );
  TestValidator.equals("actor_type unchanged")(updatedLog.actor_type)(
    originalLog.actor_type,
  );
  TestValidator.equals("action_type unchanged")(updatedLog.action_type)(
    originalLog.action_type,
  );
  TestValidator.equals("action_timestamp unchanged")(
    updatedLog.action_timestamp,
  )(originalLog.action_timestamp);
}
