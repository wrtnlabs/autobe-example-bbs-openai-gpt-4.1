import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * 인증된 관리자가 감사 로그 전체 목록(페이지네이션) 정상 조회 가능한지 검증합니다.
 *
 * - 주요 보드 내 설정/정책 변경 등 감사 이벤트 발생 이력을 노출해야 합니다.
 * - Audit log가 실제로 존재하도록 미리 settings 신규 생성 이벤트 수행(감사 로그 데이터 보장)
 * - 조회 시 각 log row에는 actor, action_type, timestamp 필수 메타 포함 여부, 누락·순서, pagination
 *   등 체크
 *
 * [테스트 단계]
 *
 * 1. Settings 신규 생성(감사 로그 생성 유도)
 * 2. /discussionBoard/admin/auditLogs 엔드포인트 호출 (관리자 권한)
 * 3. 반환되는 감사로그 데이터 배열/메타/페이지네이션 구조 검증
 * 4. 방금 생성한 settings 이벤트가 로그 내 존재 확인(누락 없는지)
 * 5. Pagination.records, data.length, limit 등 일관성 검증
 */
export async function test_api_discussionBoard_test_list_audit_logs_as_admin(
  connection: api.IConnection,
) {
  // 1. 사전 settings 생성 → 감사 로그가 반드시 존재하도록 보장
  const settingKey = `e2e_test_${RandomGenerator.alphaNumeric(10)}`;
  const createdSetting =
    await api.functional.discussionBoard.admin.settings.create(connection, {
      body: {
        setting_key: settingKey,
        setting_value: RandomGenerator.alphaNumeric(8),
        description: "e2e 테스트용 임시 시스템 설정",
      } satisfies IDiscussionBoardSetting.ICreate,
    });
  typia.assert(createdSetting);

  // 2. 감사 로그 전체 조회 (인증/관리자)
  const auditLogPage =
    await api.functional.discussionBoard.admin.auditLogs.index(connection);
  typia.assert(auditLogPage);

  // 3. 페이지네이션 메타/데이터/필수 메타 필드 검증
  TestValidator.predicate("pagination 메타 구조")(
    typeof auditLogPage.pagination.current === "number" &&
      typeof auditLogPage.pagination.records === "number" &&
      typeof auditLogPage.pagination.pages === "number" &&
      typeof auditLogPage.pagination.limit === "number",
  );
  TestValidator.predicate("auditLog data 배열 존재")(
    Array.isArray(auditLogPage.data) && auditLogPage.data.length > 0,
  );
  for (const log of auditLogPage.data) {
    TestValidator.predicate("필수 메타(actor_id|action_type|created_at)")(
      typeof log.action_type === "string" &&
        typeof log.created_at === "string" &&
        (log.actor_id === null || typeof log.actor_id === "string"),
    );
  }

  // 4. 방금 settings 생성 이벤트 Audit 로그 내 존재 여부 확인
  const found = auditLogPage.data.some(
    (log) =>
      log.target_id === createdSetting.id ||
      log.action_detail?.includes(settingKey),
  );
  TestValidator.predicate("settings 생성 이벤트 감사로그 포함됨")(found);

  // 5. 페이지네이션 정확성 및 일관성
  TestValidator.equals("data.length <= limit")(
    auditLogPage.data.length <= auditLogPage.pagination.limit,
  )(true);
  TestValidator.equals("records >= data.length")(
    auditLogPage.pagination.records >= auditLogPage.data.length,
  )(true);
}
