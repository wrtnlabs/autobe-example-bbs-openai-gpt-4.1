import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * 멘션(mention) 생성 및 주요 플로우 검증 E2E 테스트.
 *
 * [테스트 목적]
 * - 사용자가 게시글(post) 내에서 다른 사용자를 '@유저명' 방식으로 멘션할 때, 정상이면 mention row가 생성되는지 검증
 * - 응답에 actor_member_id, mentioned_member_id, content_type, content_id가 올바르게 기록되는지 확인
 * - (알림 시스템 연동 등은 환경에 따라 별도 테스트. 본 시나리오에선 생성까지만 검증)
 *
 * [업무 프로세스 흐름]
 * 1. 멤버 A(행위자) 회원 가입
 * 2. 멤버 B(멘션 대상자) 회원 가입
 * 3. 임의의 discussion thread ID 생성
 * 4. 멤버 A가 해당 스레드 id로 post 작성
 * 5. 멤버 A가 post 안에서 멤버 B를 멘션(언급)
 * 6. 생성된 mention row가 요청 내용과 정확히 일치하는지 assert 검증
 * (7. 알림/비허용 대상자 등 추가 플로우는 별도 환경/구현 시 확장)
 */
export async function test_api_discussionBoard_test_create_mention_with_valid_data_triggers_notification(
  connection: api.IConnection,
) {
  // 1. 멤버 A 회원 가입
  const memberA_email = typia.random<string & tags.Format<"email">>();
  const memberA: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberA_email,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);

  // 2. 멤버 B 회원 가입 (멘션 대상)
  const memberB_email = typia.random<string & tags.Format<"email">>();
  const memberB: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberB_email,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  // 3. discussion thread id 생성 (포스트 작성의 thread id 용도)
  const threadId = typia.random<string & tags.Format<"uuid">>();

  // 4. 멤버 A가 post 작성 (본인이 작성자)
  const post: IDiscussionBoardPost = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: threadId,
      discussion_board_member_id: memberA.id,
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 5. 멤버 A가 해당 post 내에서 멤버 B 멘션
  const mention: IDiscussionBoardMention = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: memberB.id,
      content_type: "post",
      content_id: post.id,
    } satisfies IDiscussionBoardMention.ICreate,
  });
  typia.assert(mention);

  // 6. 생성 결과가 요청 본문 및 시나리오와 일치하는지 검증
  TestValidator.equals("mention actor")(mention.actor_member_id)(memberA.id);
  TestValidator.equals("mention target")(mention.mentioned_member_id)(memberB.id);
  TestValidator.equals("mention content_type")(mention.content_type)("post");
  TestValidator.equals("mention content_id")(mention.content_id)(post.id);
  // (실제 알림 연동, 밴 회원 등 추가적 비즈니스 플로우는 본 환경에서 미처리)
}