import { IPage } from "./IPage";
import { IDiscussionBoardTag } from "./IDiscussionBoardTag";

export namespace IPageIDiscussionBoardTag {
  /**
   * Paginated result of tag summaries for search/index endpoints with
   * standard pagination and data array structures.
   */
  export type ISummary = {
    /** Client UI pagination/status info. */
    pagination: IPage.IPagination;

    /** Summary records for each tag included in this page/result set. */
    data: IDiscussionBoardTag.ISummary[];
  };
}
