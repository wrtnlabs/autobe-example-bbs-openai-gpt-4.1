import { IPage } from "./IPage";
import { IDiscussBoardModerationLogs } from "./IDiscussBoardModerationLogs";

export namespace IPageIDiscussBoardModerationLogs {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardModerationLogs.ISummary[];
  };
}
