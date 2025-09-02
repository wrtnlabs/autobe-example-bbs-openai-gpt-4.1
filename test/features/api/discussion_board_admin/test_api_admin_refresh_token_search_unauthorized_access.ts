import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRefreshToken";
import type { IPageIDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRefreshToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자 refresh token 리스트를 비인증(비관리자) 사용자로 접근할 수 없어야 함을 검증한다.
 *
 * 본 테스트는 PATCH /discussionBoard/admin/refreshTokens 엔드포인트에
 * 인증(Authorization) 정보 없는 connection으로 접근 시, 반드시 권한거부(Permission denied,
 * 401 Unauthorized 또는 403 Forbidden) 에러가 발생함을 보장한다.
 *
 * 1. 인증 정보가 없는 connection 객체 unauthConnection을 명시적으로 생성한다.
 * 2. TestValidator.error로 비인가자의 접근이 실패(권한 오류)해야 함을 검증한다.
 *
 *    - 콜백 내부에서 await api.functional.discussionBoard.admin.refreshTokens.index 호출
 *    - Body는 typia.random<IDiscussionBoardRefreshToken.IRequest>() 등 임의 값
 * 3. 에러가 발생하지 않을 경우 테스트가 실패하도록 강제된다.
 */
export async function test_api_admin_refresh_token_search_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. 인증 정보 없는 connection 별도 생성
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 2. 비인가 접근 시도 및 에러 검증
  await TestValidator.error(
    "비인증 사용자는 admin refresh token 검색 금지",
    async () => {
      await api.functional.discussionBoard.admin.refreshTokens.index(
        unauthConnection,
        {
          body: typia.random<IDiscussionBoardRefreshToken.IRequest>(),
        },
      );
    },
  );
}
