import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostAttachment";

/**
 * 게시글 첨부파일 검색에서 조건에 맞지 않는 경우(검색 결과가 없는 상황)를 검증합니다.
 *
 * 이 테스트는 실제 첨부파일이 여러 개 존재하는 게시글에서, 존재하지 않는 파일명 또는 존재하지 않는 MIME 타입으로 첨부파일 검색 시,
 * 결과 data 배열이 비어 있는지 (empty array) 반환되는지 확인합니다.
 *
 * **비즈니스 플로우**
 *
 * 1. 테스트용 임의 threadId를 준비합니다.
 * 2. 해당 스레드에 게시글을 작성합니다.
 * 3. 작성한 게시글에 첨부파일 3개를 각각 file_name/mime_type 다르게 업로드합니다.
 * 4. 첨부파일 전체 검색으로 업로드된 첨부파일 개수(3개) 정상 확인
 * 5. 존재하지 않는 랜덤한 file_name으로 첨부파일 검색 → data가 빈 배열인지 검증
 * 6. 존재하지 않는 마임타입으로 첨부파일 검색 → data가 빈 배열인지 검증
 */
export async function test_api_discussionBoard_test_search_post_attachments_with_no_results(
  connection: api.IConnection,
) {
  // 1. 테스트용 임의 threadId를 준비
  const threadId = typia.random<string & tags.Format<"uuid">>();

  // 2. 게시글 작성 (임의 threadId)
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        discussion_board_thread_id: threadId,
        body: RandomGenerator.content()()(),
      },
    },
  );
  typia.assert(post);

  // 3. 첨부파일 3개 업로드 (file_name, mime_type 다양하게)
  const attachments = await Promise.all(
    [0, 1, 2].map((n) =>
      api.functional.discussionBoard.member.posts.attachments.create(
        connection,
        {
          postId: post.id,
          body: {
            discussion_board_post_id: post.id,
            uploader_member_id: post.creator_member_id,
            file_uri: `https://files.example.com/sample${n}.bin`,
            file_name: `testfile_${n}_${RandomGenerator.alphaNumeric(12)}`,
            mime_type:
              n === 0
                ? "image/png"
                : n === 1
                  ? "application/pdf"
                  : "text/plain",
          },
        },
      ),
    ),
  );
  attachments.forEach((att) => typia.assert(att));

  // 4. 첨부파일 전체 검색: 실제 3개 등록되어 있음을 보장
  const allAttachments =
    await api.functional.discussionBoard.posts.attachments.search(connection, {
      postId: post.id,
      body: {},
    });
  typia.assert(allAttachments);
  TestValidator.equals("첨부파일 총 3개 생성 확인")(allAttachments.data.length)(
    3,
  );

  // 5. 존재하지 않는 파일명으로 검색 → empty array 조건 검증
  const rareFileName = `notfound_${RandomGenerator.alphaNumeric(24)}`;
  const searchByRareName =
    await api.functional.discussionBoard.posts.attachments.search(connection, {
      postId: post.id,
      body: { file_name: rareFileName },
    });
  typia.assert(searchByRareName);
  TestValidator.equals("결과 없음 - file_name에 매칭되는 첨부 없음")(
    searchByRareName.data,
  )([]);

  // 6. 존재하지 않는 mime_type으로 검색 요청
  const impossibleMimeType = "application/x-nope-does-not-exist";
  const searchByImpossibleMime =
    await api.functional.discussionBoard.posts.attachments.search(connection, {
      postId: post.id,
      body: { mime_type: impossibleMimeType },
    });
  typia.assert(searchByImpossibleMime);
  TestValidator.equals("결과 없음 - mime_type 매칭 없음")(
    searchByImpossibleMime.data,
  )([]);
}
