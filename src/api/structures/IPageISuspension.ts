import { IPage } from "./IPage";
import { ISuspension } from "./ISuspension";

export namespace IPageISuspension {
  /**
   * Paginated response format for listing summary views of user suspensions.
   * Includes page metadata and the set of suspension summary objects.
   */
  export type ISummary = {
    pagination?: IPage.IPagination;
    data?: ISuspension[];
  };
}
