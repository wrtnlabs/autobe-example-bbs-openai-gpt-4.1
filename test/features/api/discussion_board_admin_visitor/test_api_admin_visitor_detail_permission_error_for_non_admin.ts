import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";

/**
 * 비관리자(비로그인 또는 일반 사용자)가 방문자 상세
 * 조회(/discussionBoard/admin/visitors/{visitorId}) 엔드포인트 접근 시 권한 오류가 발생함을
 * 검증한다.
 *
 * 이 테스트는 플랫폼의 관리자 전용 방문자 정보 열람 권한 정책이 올바르게 적용되는지 확인하기 위한 것이다.
 *
 * 단계별 테스트 플로우:
 *
 * 1. 임의 UUID로 방문자 ID를 준비한다.
 * 2. 인증되지 않은(Authorization 헤더 없음) connection으로 admin 방문자 상세조회 엔드포인트 요청 시도 → 권한
 *    오류 검증
 * 3. 일반 회원(user)로 회원가입 및 인증 토큰 발급(정상 로그인)
 * 4. 일반 사용자 계정으로 동일 엔드포인트 요청 시도 → 권한 오류 검증 (시나리오 목적상 실제 admin 계정 접근은 테스트하지 않음)
 */
export async function test_api_admin_visitor_detail_permission_error_for_non_admin(
  connection: api.IConnection,
) {
  // 1. 임의 UUID 준비
  const visitorId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. 인증되지 않은 상태(Authorization 헤더 없음)로 요청 → 권한 오류(예: 401/403)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "비로그인 상태에서 admin 방문자 상세정보 접근시 권한 거부",
    async () => {
      await api.functional.discussionBoard.admin.visitors.at(unauthConn, {
        visitorId,
      });
    },
  );

  // 3. 일반 회원가입 및 로그인(토큰발급)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12) + "Aa$1",
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // 4. 일반 사용자 로그인 토큰(Authorization)으로 동일 요청시 → 권한 오류
  await TestValidator.error(
    "일반 사용자 계정으로 admin 방문자 상세정보 접근시 권한 거부",
    async () => {
      await api.functional.discussionBoard.admin.visitors.at(connection, {
        visitorId,
      });
    },
  );
}
