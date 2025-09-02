import { IPage } from "./IPage";
import { IDiscussionBoardModerationAction } from "./IDiscussionBoardModerationAction";

export namespace IPageIDiscussionBoardModerationAction {
  /**
   * Paginated set of moderation action summary records. Used for moderation
   * dashboards, audit lists, and management search results. Follows the
   * IPage<T> pattern, always includes a pagination object and array of
   * ISummary records, with no inline or anonymous types allowed.
   */
  export type ISummary = {
    /** Pagination metadata for the current result set. */
    pagination: IPage.IPagination;

    /**
     * Array of summarized moderation action records returned in the current
     * page.
     */
    data: IDiscussionBoardModerationAction.ISummary[];
  };
}
