import { IPage } from "./IPage";
import { IDiscussionBoardComment } from "./IDiscussionBoardComment";

export namespace IPageIDiscussionBoardComment {
  /**
   * Paginated result container for summary objects
   * (IDiscussionBoardComment.ISummary) representing board comments.
   *
   * This paginated structure is used in list/search APIs for board comments,
   * summarizing comment activity for UI/analytics/search functions. It
   * embeds:
   *
   * - Pagination: Standard IPage.IPagination metadata
   * - Data: Array of comment summary records
   *
   * This aligns with standard board API pagination practices, and is designed
   * for compatibility with large-scale moderation/analytics tools or
   * user-facing comment feeds.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** Summary comment records for the current page. */
    data: IDiscussionBoardComment.ISummary[];
  };
}
