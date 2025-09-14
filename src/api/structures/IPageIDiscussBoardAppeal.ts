import { IPage } from "./IPage";
import { IDiscussBoardAppeal } from "./IDiscussBoardAppeal";

export namespace IPageIDiscussBoardAppeal {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardAppeal.ISummary[];
  };
}
