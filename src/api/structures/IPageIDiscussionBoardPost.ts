import { IPage } from "./IPage";
import { IDiscussionBoardPost } from "./IDiscussionBoardPost";

export namespace IPageIDiscussionBoardPost {
  /**
   * Paginated summary result set for posts, used in post/thread search/list
   * endpoints.
   */
  export type ISummary = {
    /** Pagination info (current page, records, limit, pages). */
    pagination: IPage.IPagination;

    /** Array of post summaries for this page. */
    data: IDiscussionBoardPost.ISummary[];
  };
}
