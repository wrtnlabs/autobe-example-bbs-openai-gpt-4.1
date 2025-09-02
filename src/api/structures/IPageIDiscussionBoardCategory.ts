import { IPage } from "./IPage";
import { IDiscussionBoardCategory } from "./IDiscussionBoardCategory";

export namespace IPageIDiscussionBoardCategory {
  /**
   * A paginated collection of IDiscussionBoardCategory.ISummary objects with
   * standard pagination metadata. Used for index/listing endpoints.
   */
  export type ISummary = {
    /** Pagination information and record counts for client UI navigation. */
    pagination: IPage.IPagination;

    /** Array of category summary objects shown on the page. */
    data: IDiscussionBoardCategory.ISummary[];
  };
}
