import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * 신규 가입 & 인증된 유저가 자신이 생성한 쓰레드에 게시글을 정상적으로 작성할 수 있는 시나리오 검증.
 *
 * [비즈니스 배경]
 *
 * - 회원가입과 인증 후 토큰 발급 → 동일 연결 객체(context)로 thread 생성 및 게시글(post) 작성까지 일관된 권한
 *   하에 처리
 *
 * [테스트 플로우]
 *
 * 1. 회원가입 (이메일/사용자명/패스워드/닉네임/약관동의)
 *
 *    - 토큰 즉시 발급 → connection.headers.Authorization 자동 저장
 *    - UserId 파싱하여 이후 작성자 필드 검증용으로 사용
 * 2. Thread 생성: 제목 랜덤 입력
 * 3. Thread_id 기반 게시글(post) 생성: title, body 모두 랜덤 생성
 * 4. 생성된 post의 필수 메타데이터 및 입력 값, 작성자 정보 등 철저히 검증
 *
 * [주요 검증 포인트]
 *
 * - 요청 title/body와 postRes 응답값 일치
 * - Thread_id, created_by_id 값이 모두 올바른지(귀속성/소유성)
 * - Deleted_at(삭제/휴지통) 필드 없음/미설정
 * - Created_at, updated_at 타임스탬프 필드 존재
 */
export async function test_api_post_creation_success_user(
  connection: api.IConnection,
) {
  // 1. 신규 유저 회원가입 및 인증(토큰)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(12) + "!Aa1"; // 최소 10자, 영대소문자+숫자+특수문자(정책 준수)
  const displayName = RandomGenerator.name();
  const consent = true;

  const joinRes = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinRes);
  const userId = joinRes.user.id;

  // 2. thread(쓰레드) 생성
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 12,
  });
  const threadRes = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(threadRes);

  // 3. thread_id 기준 post(게시글) 생성
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 20,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 12,
  });
  const postRes =
    await api.functional.discussionBoard.user.threads.posts.create(connection, {
      threadId: threadRes.id,
      body: {
        thread_id: threadRes.id,
        title: postTitle,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(postRes);

  // 4. 데이터/소유성/필수 메타 필드 검증
  TestValidator.equals(
    "post의 제목이 요청값과 일치해야 함",
    postRes.title,
    postTitle,
  );
  TestValidator.equals(
    "post 본문(body)이 요청값과 일치해야 함",
    postRes.body,
    postBody,
  );
  TestValidator.equals(
    "post가 올바른 thread_id에 귀속되어야 함",
    postRes.thread_id,
    threadRes.id,
  );
  TestValidator.equals(
    "post 작성자(created_by_id)가 회원가입한 유저여야 함",
    postRes.created_by_id,
    userId,
  );
  TestValidator.predicate(
    "post는 삭제 상태가 아니어야 함 (deleted_at 없음)",
    postRes.deleted_at === null || postRes.deleted_at === undefined,
  );
  TestValidator.predicate(
    "post에 created_at, updated_at 타임스탬프가 존재해야 함",
    typeof postRes.created_at === "string" &&
      typeof postRes.updated_at === "string",
  );
}
