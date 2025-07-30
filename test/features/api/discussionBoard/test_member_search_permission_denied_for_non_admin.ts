import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 일반 회원이 관리 기능인 멤버 검색을 시도할 때 권한 오류가 발생하는지 검증합니다.
 *
 * 1. 관리자가 아닌 일반 회원을 생성합니다.
 * 2. 해당 회원(비관리자)으로 로그인(단순히 연결을 그대로 사용)한 상태에서, 관리용 멤버 검색 엔드포인트
 *    (/discussionBoard/admin/members search)를 호출합니다.
 * 3. 호출 시 권한 거부(예: 403 Forbidden) 오류가 발생하는지 확인합니다.
 * 4. 성공적으로 검색 응답이 오면 실패로 간주합니다.
 */
export async function test_api_discussionBoard_test_member_search_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. 관리자가 아닌 일반 회원을 생성합니다.
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(10),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. 해당 회원(비관리자) 상태에서 관리용 멤버 검색을 시도합니다.
  await TestValidator.error("non-admin cannot search members")(async () => {
    await api.functional.discussionBoard.admin.members.search(connection, {
      body: {},
    });
  });
}
