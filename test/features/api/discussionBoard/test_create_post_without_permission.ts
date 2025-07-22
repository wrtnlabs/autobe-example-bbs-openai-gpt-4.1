import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * 테스트: 토론 게시판에서 인증되지 않은 사용자(게스트) 또는 비활성(정지/중단)된 회원이 게시글을 생성하려 하면 허용되지 않고 오류가 반환되어야 한다. 또한 탈퇴(비활성) 회원 계정으로 시도할 때도 검증한다. 실패 조건시 DB에 게시글이 남지 않는지도 확인한다.
 *
 * 절차:
 * 1. 새 회원 등록(이후 비활성화/정지 특수 상태 시나리오용)
 * 2. 인증 없는 게스트 연결에서 게시글 생성 시도 → 실패(권한 거부) 기대
 * 3. 해당 회원 계정을 비활성화(삭제, is_active=false 등)로 간주하고, 이 계정으로 다시 게시글 생성 시도 → 실패(권한 거부) 기대
 * (정지 처리와 비활성 처리 모두 is_active=false 플래그 단일로 관리한다면 이를 활용)
 * 4. 항상 오류가 반환되는지, 실패 시 DB에 실제 게시글이 남지 않는지도 검증한다(가능하다면 select 등 추가 검증).
 *
 * 현재 제공된 API만으로 DB내 게시글 잔존여부 검증, 회원 is_active 상태변경(관리자/탈퇴/정지 처분) 등은 불가하므로 해당 단계는 명시적 주석으로 남긴다.
 */
export async function test_api_discussionBoard_test_create_post_without_permission(
  connection: api.IConnection,
) {
  // 1. 회원 계정 생성
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<'email'>>(),
      hashed_password: RandomGenerator.alphaNumeric(24),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 임의 쓰레드 및 회원 정보로 post body 준비
  const postBody: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: typia.random<string & tags.Format<'uuid'>>(),
    discussion_board_member_id: member.id,
    body: RandomGenerator.paragraph()(),
  };

  // 2. 게스트(비인증) - 헤더 없는 연결로 생성 시도
  const guestConnection = { ...connection, headers: {} };
  await TestValidator.error("게스트는 포스트 생성 불가")(async () =>
    api.functional.discussionBoard.posts.post(guestConnection, {
      body: postBody,
    })
  );

  // 3. 회원 비활성(직접 is_active 설정 API는 없음 → 시스템상 직접 관리자 DB 조작 필요)
  // 본 e2e에서는 API 한계로 실제 테스트는 불가, 별도 skip/주의
  // 만약 관리 API가 추가되면 member.is_active=false 설정 후 동일 포스트 생성 시도 및 실패 검증 실시
  // (현재는 시나리오 문서로만 명시)
}