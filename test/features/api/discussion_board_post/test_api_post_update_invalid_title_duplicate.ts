import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_post_update_invalid_title_duplicate(
  connection: api.IConnection,
) {
  /**
   * 동일 스레드 내 게시글 제목 고유성 제약 검증 및 위반 시 에러 발생 테스트.
   *
   * 1. 사용자 회원가입/인증 및 권한 세팅
   * 2. 토픽/스레드 생성
   * 3. 첫 번째 게시글 작성(고유 제목)
   * 4. 두 번째 게시글 작성(다른 제목)
   * 5. 두 번째 게시글의 제목을 첫 번째 게시글과 동일하게 수정 시도
   * 6. 제목 고유성 위반으로 인한 에러 발생 검증
   */

  // 1. 사용자 회원가입 및 토큰 발급
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "Aa!1";
  const joinRes = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinRes);

  // 2. 스레드 생성
  const threadTitle = RandomGenerator.paragraph({ sentences: 3, wordMin: 6 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: { title: threadTitle } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. 첫 번째 게시글 생성(제목 A)
  const postTitleA = RandomGenerator.paragraph({ sentences: 2, wordMin: 5 });
  const postBodyA = RandomGenerator.content({ paragraphs: 2, sentenceMin: 10 });
  const postA = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: postTitleA,
        body: postBodyA,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(postA);

  // 4. 두 번째 게시글 생성(제목 B)
  const postTitleB = RandomGenerator.paragraph({ sentences: 2, wordMin: 5 });
  const postBodyB = RandomGenerator.content({ paragraphs: 2, sentenceMin: 10 });
  const postB = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: postTitleB,
        body: postBodyB,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(postB);

  // 5. 두 번째 게시글 제목을 첫 번째와 동일하게 변경 시도 (고유성 위반 발생 예상)
  await TestValidator.error(
    "동일 스레드 내 게시글 제목 중복 시도 시 고유성 위반 에러 발생",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.update(
        connection,
        {
          threadId: thread.id,
          postId: postB.id,
          body: { title: postTitleA } satisfies IDiscussionBoardPost.IUpdate,
        },
      );
    },
  );
}
