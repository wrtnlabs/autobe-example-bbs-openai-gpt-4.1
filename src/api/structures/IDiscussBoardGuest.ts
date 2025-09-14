import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussBoardGuest {
  /**
   * Payload for guest creation in discuss_board_guests, used for tracking
   * anonymous/temporary visitors for analytics and conversion funnel
   * analysis. Does not include credential or login values. Required for
   * system analytics, monitoring, and initial guest entity creation.
   */
  export type ICreate = {
    /**
     * IP address of the guest user for analytics and security monitoring.
     *
     * Used to identify and analyze anonymous traffic and conversions. This
     * is required and is expected to be IPv4 or IPv6 format as supplied by
     * the user's browser or reverse proxy. Referenced in analytics and
     * anti-abuse monitoring, but treated as sensitive data for privacy.
     */
    ip_address: string;

    /**
     * User agent string representing the guest's browser/device for
     * analytics.
     *
     * Required to support device, OS, and browser analysis for conversion
     * and anti-fraud. Used only for statistical and business purposes.
     * Handled as PII per the system's privacy policy.
     */
    user_agent: string;

    /**
     * Origin URL where the guest came from for conversion analysis.
     *
     * Optional, as not all browsers/devices provide a referer. Used for
     * tracking referral sources and onboarding funnel performance. Null if
     * unavailable. Subject to privacy minimization requirements.
     */
    referer?: string | null | undefined;
  };

  /**
   * Payload to request issuance of a new JWT pair for a guest session, via
   * refresh token only. Required for all guest token refresh operations on
   * discussBoard.
   */
  export type IRefresh = {
    /**
     * The refresh token string to be validated for guest JWT session
     * refresh.
     *
     * Required. Issued as part of initial guest join. Used to continue an
     * anonymous/unauthenticated session without rejoining as a new guest.
     * Never share with other accounts or roles.
     */
    refresh_token: string;
  };

  /**
   * Represents authorization and temporary identity after guest
   * join/login/refresh. Returns guest id and JWT token. Used in client for
   * maintaining anonymous/limited access session. Does not expose any
   * sensitive fields or credential information.
   */
  export type IAuthorized = {
    /**
     * Globally unique identifier (UUID) of the guest record issued on join.
     *
     * Used as short-term, anonymous entity ID for analytics, tracking, and
     * session management. Must be referenced in subsequent analytics and
     * session operations.
     */
    id: string;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
