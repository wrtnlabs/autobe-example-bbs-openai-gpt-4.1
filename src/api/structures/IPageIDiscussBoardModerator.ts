import { IPage } from "./IPage";
import { IDiscussBoardModerator } from "./IDiscussBoardModerator";

export namespace IPageIDiscussBoardModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardModerator.ISummary[];
  };
}
