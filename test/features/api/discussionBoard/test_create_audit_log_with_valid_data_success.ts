import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * [관리자 감사 로그 기록 성공 테스트]
 *
 * 본 테스트는 관리자 권한으로 /discussionBoard/admin/auditLogs 엔드포인트를 통해 유효한 감사 로그 생성 요청 시
 * 정상적으로 기록이 저장되고, 모든 시스템/입력 필드가 일관되게 반환되는지 검증합니다.
 *
 * 1. 감사 로그 입력 DTO를 actor_id, target_id, action_type, action_detail을 모두 포함하도록 임의
 *    데이터로 구성한다 (필수/선택 필드 모두 포함).
 * 2. AuditLogs.create API를 호출하여 로그 생성 요청을 수행한다.
 * 3. 반환 응답에 시스템 생성 필드(id, created_at 등)와 입력값이 모두 포함되고, 값이 정확히 반영되었는지 검증한다.
 * 4. 각 필드 타입 및 key 존재 여부, 값의 일치성(assert), 서버 생성 시스템 값 존재성도 확인한다.
 */
export async function test_api_discussionBoard_admin_auditLogs_create(
  connection: api.IConnection,
) {
  // 1. 임의 감사 로그 입력 데이터 구성 (필수+선택 모두)
  const input: IDiscussionBoardAuditLog.ICreate = {
    actor_id: typia.random<string & tags.Format<"uuid">>(),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "assign_moderator",
    action_detail: "커뮤니티 관리권한 위임 처리",
  };

  // 2. 감사 로그 생성 API 호출
  const output = await api.functional.discussionBoard.admin.auditLogs.create(
    connection,
    { body: input },
  );
  typia.assert(output);

  // 3. 반환 필드 검증: id, created_at(ISO8601), 입력 필드 값 일치 확인
  TestValidator.predicate("id는 uuid이어야 함")(
    typeof output.id === "string" && /^[0-9a-fA-F\-]{36}$/.test(output.id),
  );
  TestValidator.predicate("created_at은 ISO8601이어야 함")(
    typeof output.created_at === "string" &&
      !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.equals("actor_id 일치")(output.actor_id)(input.actor_id);
  TestValidator.equals("target_id 일치")(output.target_id)(input.target_id);
  TestValidator.equals("action_type 일치")(output.action_type)(
    input.action_type,
  );
  TestValidator.equals("action_detail 일치")(output.action_detail)(
    input.action_detail,
  );
}
