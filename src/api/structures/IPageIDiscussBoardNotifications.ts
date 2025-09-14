import { IPage } from "./IPage";
import { IDiscussBoardNotifications } from "./IDiscussBoardNotifications";

export namespace IPageIDiscussBoardNotifications {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardNotifications.ISummary[];
  };
}
