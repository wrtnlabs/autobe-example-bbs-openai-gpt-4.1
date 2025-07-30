import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * [감사 로그 상세 조회 기능 검증]
 *
 * 이 테스트는 관리자(admin) 권한으로, 특정 감사 로그(audit log) 상세 정보를 정확하게 조회하는 절차를 검증합니다.
 *
 * [테스트 절차 및 비즈니스 컨텍스트 설명]
 *
 * 1. 관리자 자격으로 감사 로그(audit log) 엔트리를 1건 생성합니다. (actor_id 등 메타정보 포함)
 * 2. 생성된 감사 로그 엔트리의 id(auditLogId)를 획득합니다. (정상 UUID 채번 여부도 검증)
 * 3. 해당 id를 사용하여 감사 로그 상세 조회 API를 호출합니다.
 * 4. 응답 결과가 요청한 id의 감사 로그임을 확인하고, actor_id, action_type, created_at 등 핵심 필드값이 모두
 *    보존되어 있는지, 정보 누락 없이 반환되는지 검증합니다.
 * 5. API 응답 타입 및 데이터 스키마가 실제 반환값과 일치하는지 typia.assert()로 반복 검증합니다.
 *
 * 이 테스트는 실제 관리/감사 환경에서 보안 감사 이력, 정책 변경 추적, 위임 등 중요한 이벤트에 대한 감사 로그의 신뢰성 및 상세 제공
 * 여부를 보장하기 위해 필요합니다.
 */
export async function test_api_discussionBoard_admin_auditLogs_test_retrieve_existing_audit_log_by_id_with_valid_admin_role(
  connection: api.IConnection,
) {
  // 1. 감사 로그 엔트리 신규 생성 (필수 actor_id, action_type 등 포함)
  const createBody: IDiscussionBoardAuditLog.ICreate = {
    actor_id: typia.random<string & tags.Format<"uuid">>(),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "assign_moderator", // 실제 용도 적합한 예시 액션명
    action_detail: "카테고리 관리자 권한 위임",
  };
  const created: IDiscussionBoardAuditLog =
    await api.functional.discussionBoard.admin.auditLogs.create(connection, {
      body: createBody,
    });
  typia.assert(created);
  TestValidator.equals("생성 후 id 형식")(typeof created.id)("string");

  // 2. 생성된 감사 로그 id로 상세 조회 요청
  const fetched: IDiscussionBoardAuditLog =
    await api.functional.discussionBoard.admin.auditLogs.at(connection, {
      auditLogId: created.id,
    });
  typia.assert(fetched);

  // 3. 조회 결과의 필수 핵심 메타 검증
  TestValidator.equals("id 일치")(fetched.id)(created.id);
  TestValidator.equals("actor_id 일치")(fetched.actor_id)(createBody.actor_id);
  TestValidator.equals("action_type 일치")(fetched.action_type)(
    createBody.action_type,
  );
  TestValidator.equals("action_detail 일치")(fetched.action_detail)(
    createBody.action_detail,
  );
  TestValidator.equals("target_id 일치")(fetched.target_id)(
    createBody.target_id,
  );
  TestValidator.predicate("created_at 타임스탬프 존재 여부")(
    !!fetched.created_at,
  );
}
