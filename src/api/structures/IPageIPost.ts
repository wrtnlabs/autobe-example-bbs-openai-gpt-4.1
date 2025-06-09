import { IPage } from "./IPage";
import { IPost } from "./IPost";

export namespace IPageIPost {
  /**
   * 게시글(포스트) 요약(`IPost.ISummary`)의 페이징 응답타입입니다.
   *
   * Pagination: 페이지 정보
   *
   * Data: 게시글 요약 정보 배열
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** 포스트(게시글) 요약 정보 리스트. */
    data: IPost.ISummary[];
  };
}
