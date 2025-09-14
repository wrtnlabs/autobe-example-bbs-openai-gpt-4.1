import { IPage } from "./IPage";
import { IDiscussBoardPostEditHistory } from "./IDiscussBoardPostEditHistory";

export namespace IPageIDiscussBoardPostEditHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardPostEditHistory.ISummary[];
  };
}
