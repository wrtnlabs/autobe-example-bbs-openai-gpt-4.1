import { IPage } from "./IPage";
import { IDiscussBoardAdministrator } from "./IDiscussBoardAdministrator";

export namespace IPageIDiscussBoardAdministrator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardAdministrator.ISummary[];
  };
}
