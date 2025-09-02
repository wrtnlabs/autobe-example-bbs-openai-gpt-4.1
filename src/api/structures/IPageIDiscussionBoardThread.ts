import { IPage } from "./IPage";
import { IDiscussionBoardThread } from "./IDiscussionBoardThread";

export namespace IPageIDiscussionBoardThread {
  /**
   * Paginated result set for thread summary list views. Used in /threads
   * search/list endpoints.
   */
  export type ISummary = {
    /** Pagination information for the result set. */
    pagination: IPage.IPagination;

    /** Array of thread summaries. */
    data: IDiscussionBoardThread.ISummary[];
  };
}
