import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * 존재하지 않는 유저 Appeal(이의제기) 삭제 시도시 404 Not Found 오류를 검증하는 E2E 테스트
 *
 * [비즈니스 배경]
 *
 * - 유저가 직접 Appeal(이의제기) 레코드를 soft-delete(은닉) 할 때, 시스템은 해당 appealId가 존재하지 않을
 *   경우 404 에러를 반환해야 한다.
 * - 이 과정에서 반드시 인증(회원가입 및 토큰발급)이 선행되어야 하며, appealId로 존재하지 않는 값(랜덤 uuid 등) 사용 시
 *   정상적으로 차단이 이뤄지는지 확인이 필요하다.
 *
 * [테스트 흐름]
 *
 * 1. 신규 유저 회원가입을 진행 (POST /auth/user/join), 인증
 *    컨텍스트(connection.headers.Authorization) 확보
 * 2. 임의의 랜덤 uuid(존재하지 않을 확률이 높은 값)를 appealId로 사용
 * 3. DELETE /discussionBoard/user/appeals/{appealId} 호출하여 404(존재하지 않는 리소스) 오류
 *    발생 검증 (TestValidator.httpError)
 */
export async function test_api_user_appeal_erase_not_found(
  connection: api.IConnection,
) {
  // 1. 회원가입(자동 로그인)
  const newUser = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10) + "A!9#",
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const auth = await api.functional.auth.user.join(connection, {
    body: newUser,
  });
  typia.assert(auth);

  // 2. 실제로 존재하지 않을 appeal id 생성
  const appealId = typia.random<string & tags.Format<"uuid">>();

  // 3. 삭제 시도시 404 Not Found 에러 반환 검증
  await TestValidator.httpError(
    "존재하지 않는 appealId 삭제 시도시 404 반환됨",
    404,
    async () => {
      await api.functional.discussionBoard.user.appeals.erase(connection, {
        appealId,
      });
    },
  );
}
