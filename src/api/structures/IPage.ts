import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata for paged responses, including
   * current/limit/total/pageCount as per business requirements and search
   * usability.
   */
  export type IPagination = {
    /** Current page number. */
    current: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /** Limitation of records per a page. Default: 100. */
    limit: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /** Total records in the database. */
    records: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /** Total number of pages (records/limit, ceiled). */
    pages: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;
  };
}
