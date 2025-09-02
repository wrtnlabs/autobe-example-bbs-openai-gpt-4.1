import { IPage } from "./IPage";
import { IDiscussionBoardDataErasureRequest } from "./IDiscussionBoardDataErasureRequest";

export namespace IPageIDiscussionBoardDataErasureRequest {
  /**
   * Paginated set of data erasure request summary records for privacy
   * audit/admin UI.
   */
  export type ISummary = {
    /** Pagination information per query parameters and result flags. */
    pagination: IPage.IPagination;

    /**
     * Summary records for data erasure requests matching search/filter
     * arguments.
     */
    data: IDiscussionBoardDataErasureRequest.ISummary[];
  };
}
