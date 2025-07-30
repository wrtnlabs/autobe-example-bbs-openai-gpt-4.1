import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * 감사 로그 생성시 필수 필드 유효성 검증 테스트 (타입 오류 없이 가능)
 *
 * 관리자 권한으로 감사 로그를 생성 시도할 때, 정상적인 형식(타입을 만족하는 입력값)에서는 요청이 성공하고, 선택 필드를 null 또는
 * undefined 등 허용하는 값으로 두었을 때도 시스템이 허용하는지 검증한다.
 *
 * 비즈니스적으로 반드시 필요한 필드(action_type 등)는 타입 시스템 상에서 이미 보장되므로, 불완전한 테스트(컴파일 타임에 걸리는
 * 테스트)는 생략한다.
 *
 * 테스트 흐름:
 *
 * 1. 최소 필수값만 입력하여 정상 생성(성공)
 * 2. 선택 필드를 모두 null로 전달해 생성(성공 및 null 체크)
 * 3. 모든 필드를 적정값으로 채워서 생성(성공 및 값 검증)
 */
export async function test_api_discussionBoard_admin_auditLogs_create_validation(
  connection: api.IConnection,
) {
  // 1. 필수 값만 입력 → 정상 생성
  const minimal = await api.functional.discussionBoard.admin.auditLogs.create(
    connection,
    {
      body: {
        action_type: "assign_moderator",
      },
    },
  );
  typia.assert(minimal);
  TestValidator.equals("action_type 값")(minimal.action_type)(
    "assign_moderator",
  );

  // 2. 선택 필드를 모두 null로 채워서 생성
  const nullCase = await api.functional.discussionBoard.admin.auditLogs.create(
    connection,
    {
      body: {
        action_type: "policy_change",
        actor_id: null,
        target_id: null,
        action_detail: null,
      },
    },
  );
  typia.assert(nullCase);
  TestValidator.equals("action_type 값")(nullCase.action_type)("policy_change");
  TestValidator.equals("actor_id null 체크")(nullCase.actor_id)(null);
  TestValidator.equals("target_id null 체크")(nullCase.target_id)(null);
  TestValidator.equals("action_detail null 체크")(nullCase.action_detail)(null);

  // 3. 모든 필드 입력 정상 생성
  const complete = await api.functional.discussionBoard.admin.auditLogs.create(
    connection,
    {
      body: {
        action_type: "user_ban",
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        target_id: typia.random<string & tags.Format<"uuid">>(),
        action_detail: "반복적인 정책 위반으로 계정 정지 처리.",
      },
    },
  );
  typia.assert(complete);
  TestValidator.equals("action_type 매칭")(complete.action_type)("user_ban");
  TestValidator.equals("action_detail 매칭")(complete.action_detail)(
    "반복적인 정책 위반으로 계정 정지 처리.",
  );
}
