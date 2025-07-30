import { IPage } from "./IPage";
import { IDiscussionBoardPostAttachment } from "./IDiscussionBoardPostAttachment";

export namespace IPageIDiscussionBoardPostAttachment {
  /**
   * Paginated result for summary views of discussion board post attachments.
   *
   * This schema defines the paginated container for lists of post attachments
   * in summary format for the discussion board system. It is designed to be
   * used in endpoints that support paginated lists or advanced filtered
   * results for post file attachments, for both admin/moderation UIs and
   * user-facing features. The main properties are:
   *
   * - `pagination`: Standard pagination metadata, referencing the reusable
   *   IPage.IPagination structure. Indicates the current page, record count
   *   and total pages for the attachment query results.
   * - `data`: Array of summary objects, each using the
   *   IDiscussionBoardPostAttachment.ISummary schema. Each object represents
   *   a simplified attachment record for a specific post, containing enough
   *   information for listing, preview, or file audit.
   *
   * This structure is widely used in list, search, and filter endpoints
   * relating to attachments on posts. Summary objects usually omit large
   * binary/file fields and focus on references and metadata needed for
   * navigation, rendering, and moderation.
   *
   * See also: IPage.IPagination for pagination metadata;
   * IDiscussionBoardPostAttachment.ISummary for attachment item structure.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /**
     * Array of summary objects for post attachments, in order as returned
     * by query.
     */
    data: IDiscussionBoardPostAttachment.ISummary[];
  };
}
