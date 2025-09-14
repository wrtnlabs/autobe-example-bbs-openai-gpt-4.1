import { IPage } from "./IPage";
import { IDiscussBoardModerationAction } from "./IDiscussBoardModerationAction";

export namespace IPageIDiscussBoardModerationAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardModerationAction.ISummary[];
  };
}
