import { tags } from "typia";

export namespace IDiscussBoardNotifications {
  /**
   * Request type for searching paginated discussBoard notification delivery
   * logs. Supports advanced filtering, sorting, and pagination for audit,
   * analytics, or compliance reviews. Maps all query semantics to appropriate
   * Prisma schema columns.
   */
  export type IRequest = {
    /**
     * Optional. Target user for whom notification events are searched—often
     * specified by administrator.
     */
    user_account_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional. Filter notifications by the event type (e.g., reply,
     * moderation, system_alert).
     */
    event_type?: string | undefined;

    /**
     * Optional. Notification delivery channel filter ('email', 'sms',
     * 'push', 'in_app', or external integrations).
     */
    delivery_channel?: string | undefined;

    /**
     * Optional. Notification delivery status filter (e.g., 'pending',
     * 'delivered', 'failed', 'bounced', 'suppressed').
     */
    delivery_status?: string | undefined;

    /**
     * Optional. Begin filter window for creation timestamp (ISO 8601 UTC).
     * Used to restrict search window for audits.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /** Optional. End filter window for creation timestamp (ISO 8601 UTC). */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /** Optional. Page number for pagination (1-indexed). */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /** Optional. Pagination limit per page (max 1000). */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>)
      | undefined;

    /**
     * Optional. Sort field for advanced result ordering (e.g.,
     * 'created_at').
     */
    sort_by?: string | undefined;

    /** Optional. Sort direction: 'asc' for ascending, 'desc' for descending. */
    sort_direction?: "asc" | "desc" | undefined;
  };

  /**
   * Summary/aggregate search result for notification logs
   * (discuss_board_notifications). Shows delivery status, recipient, subject,
   * channel, and key timestamps. Used for dashboard/event table listings.
   */
  export type ISummary = {
    /** Unique identifier for this notification event. */
    id: string & tags.Format<"uuid">;

    /** UUID of the user account receiving this notification event. */
    user_account_id: string & tags.Format<"uuid">;

    /** Type of event (e.g., 'reply', 'moderation', 'system_alert', etc.). */
    event_type: string;

    /** Method of delivery: 'email', 'sms', 'push', 'in_app', etc. */
    delivery_channel: string;

    /** Notification subject/summary (truncated, for dashboard use). */
    subject: string;

    /**
     * Delivery status ('pending', 'delivered', 'failed', 'bounced',
     * 'suppressed').
     */
    delivery_status: string;

    /** Timestamp of successful delivery, if occurred (nullable). */
    delivered_at: (string & tags.Format<"date-time">) | null;

    /** Timestamp of notification creation. */
    created_at: string & tags.Format<"date-time">;
  };
}
