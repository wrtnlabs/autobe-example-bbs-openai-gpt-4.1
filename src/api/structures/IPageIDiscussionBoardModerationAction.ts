import { IPage } from "./IPage";
import { IDiscussionBoardModerationAction } from "./IDiscussionBoardModerationAction";

export namespace IPageIDiscussionBoardModerationAction {
  /**
   * A page of summarized moderation actions, including pagination metadata
   * and summaries as defined under IDiscussionBoardModerationAction.ISummary.
   * Used for moderation audit/log UI overviews.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: IDiscussionBoardModerationAction.ISummary[];
  };
}
