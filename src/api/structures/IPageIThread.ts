import { IPage } from "./IPage";
import { IThread } from "./IThread";

export namespace IPageIThread {
  /**
   * 스레드 요약 정보의 페이징 응답 타입(IPage 구조의 구체화).
   *
   * Pagination: 현재 페이지 정보
   *
   * Data: 스레드 요약(IThread.ISummary) 목록
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** 검색 결과 스레드 요약 리스트입니다. */
    data: IThread.ISummary[];
  };
}
