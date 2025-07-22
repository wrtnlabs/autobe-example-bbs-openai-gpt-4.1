import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * 밴 또는 충분한 권한이 없는 회원의 멘션 생성 금지 검증
 *
 * 이 테스트는 다음 시나리오를 검증합니다:
 * - 제재(밴)된 회원이 discussion board mention(멘션) 생성 API를 호출할 때 반드시 forbidden(차단) 오류가 발생해야 한다.
 * - 멤버 계정과 제재 상태를 제대로 준비하여 실제 금지 정책이 효과적으로 동작하는지 확인한다.
 * - 같은 회원이 반복적으로 금지된 행동(멘션)을 시도할 경우에도 일관성 있게 차단되는 것을 확인한다.
 *
 * [실행 단계]
 * 1. 새로운 멤버(mention sender) 계정을 생성한다.
 * 2. 위 회원에게 밴을 적용한다 (밴 부여자는 별도 생성한 moderator 계정).
 * 3. 멘션 대상(mentioned_member)로 임의의 두 번째 멤버를 생성한다.
 * 4. 밴 상태의 회원으로 멘션을 시도 시, 반드시 에러(Forbidden)가 발생해야 한다.
 * 5. 같은 금지된 회원의 멘션 반복 시도 역시 일관되게 차단됨을 검증한다.
 */
export async function test_api_discussionBoard_test_create_mention_forbidden_by_ban_or_permission(
  connection: api.IConnection,
) {
  // 1. 멘션 시도자(mention sender) 계정 생성
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: member1Email,
        hashed_password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  // 2. 제재(밴) 등록: 별도 moderator 생성 및 밴 적용
  const moderator: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: typia.random<string & tags.Format<"email">>(),
        hashed_password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(moderator);

  const ban: IDiscussionBoardBan =
    await api.functional.discussionBoard.bans.post(connection, {
      body: {
        member_id: member1.id,
        moderator_id: moderator.id,
        ban_reason: "멘션 금지 테스트용 밴",
        permanent: true,
      } satisfies IDiscussionBoardBan.ICreate,
    });
  typia.assert(ban);

  // 3. 멘션 제3자 계정(mentioned_member) 생성
  const member2: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphabets(6),
        email: typia.random<string & tags.Format<"email">>(),
        hashed_password: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // 4. 금지(밴)된 멤버로 멘션 생성 시도 – 실패(Forbidden) 여부 검증
  await TestValidator.error("밴 회원의 멘션 생성은 반드시 금지되어야 함")(
    () =>
      api.functional.discussionBoard.mentions.post(connection, {
        body: {
          mentioned_member_id: member2.id,
          content_type: "post",
          content_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardMention.ICreate,
      })
  );

  // 5. 동일 금지 회원의 반복 시도도 일관적으로 차단되는지 확인
  await TestValidator.error("반복 멘션 시도 역시 금지/차단됨")(
    () =>
      api.functional.discussionBoard.mentions.post(connection, {
        body: {
          mentioned_member_id: member2.id,
          content_type: "comment",
          content_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardMention.ICreate,
      })
  );
}