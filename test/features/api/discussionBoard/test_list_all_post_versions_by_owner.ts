import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPageIDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";

/**
 * 게시글 소유자가 해당 게시글의 모든 버전 스냅샷을 조회할 수 있음을 검증합니다.
 *
 * 시나리오:
 *
 * 1. 관리자로서 새로운 멤버를 등록합니다.
 * 2. (생성된 멤버 권한으로) 토픽을 생성합니다.
 * 3. 생성된 토픽에 스레드를 만듭니다.
 * 4. 해당 스레드에 초기 게시글(포스트)을 작성합니다.
 * 5. 게시글을 2회 이상 수정하여(버전 생성) 버전 기록을 누적시킵니다.
 * 6. 그 게시글의 버전 목록 API를 호출하여, 버전들이 올바르게 누적·정렬되어 있는지, 각 버전 스냅샷의 필드(버전 번호, 본문, 편집자
 *    ID, 생성시각)가 모두 정상적으로 포함되어 있는지 검증합니다.
 */
export async function test_api_discussionBoard_test_list_all_post_versions_by_owner(
  connection: api.IConnection,
) {
  // 1. 관리자로 멤버 등록 (유일 식별자, 가입 시각)
  const joinTime: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: joinTime,
      },
    },
  );
  typia.assert(member);

  // 2. (멤버 세션 가정) 토픽 생성 (카테고리 UUID는 샘플)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        description: null,
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 3. 토픽에 스레드 생성
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(6),
        },
      },
    );
  typia.assert(thread);

  // 4. 초기 게시글 생성
  const initPostBody = RandomGenerator.content()()();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: initPostBody,
      },
    },
  );
  typia.assert(post);

  // 5. 게시글 2회 이상 수정 (버전 추가)
  const editBodies = [
    RandomGenerator.content()()(),
    RandomGenerator.content()()(),
  ];
  for (const editBody of editBodies) {
    const version =
      await api.functional.discussionBoard.member.posts.versions.create(
        connection,
        {
          postId: post.id,
          body: {
            discussion_board_post_id: post.id,
            body: editBody,
          },
        },
      );
    typia.assert(version);
  }

  // 6. 버전 목록(히스토리) 조회 및 검증
  const versionPage =
    await api.functional.discussionBoard.member.posts.versions.index(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(versionPage);

  // (검증) 최초 게시 + 2번 수정 → 버전 3개 예상
  TestValidator.equals("버전 개수 일치")(versionPage.data.length)(3);

  // (검증) 버전 필드 및 누적/정렬 상태
  let expectedVersion = 1;
  for (const [i, version] of versionPage.data.entries()) {
    typia.assert(version);
    TestValidator.equals(`버전 넘버(${i})`)(version.version)(expectedVersion);
    TestValidator.equals(`게시글 ID(${i})`)(version.discussion_board_post_id)(
      post.id,
    );
    TestValidator.equals(`에디터 ID(${i})`)(version.editor_member_id)(
      member.id,
    );
    TestValidator.predicate(`본문(${i})`)(
      typeof version.body === "string" && version.body.length > 0,
    );
    TestValidator.predicate(`생성시각 ISO(${i})`)(
      typeof version.created_at === "string" &&
        !isNaN(Date.parse(version.created_at)),
    );
    ++expectedVersion;
  }
}
