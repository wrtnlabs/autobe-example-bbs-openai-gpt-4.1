# Non-Functional Requirements for discussionBoard (Political/Economic Discussion Board)

## Introduction
This document defines all non-functional requirements for the political/economic discussion board, hereafter referred to as "the system." The objective is to ensure that backend developers have clear, measurable targets for system quality attributes including performance, scalability, reliability, privacy, compliance, and security, expressed in business-relevant terms. 

## 1. Performance (Response Times, Concurrency)

### 1.1 General Response Time
- WHEN any authenticated or unauthenticated user requests to load a discussion thread or list, THE system SHALL return the list of posts or thread content within 2 seconds in 95% of cases under normal operating conditions.
- WHEN a user submits a post or comment, THE system SHALL confirm successful submission within 1.5 seconds under normal network conditions.
- WHEN search functionality is used, THE system SHALL provide full search results or filters (by tag, category, recency, or popularity) within 2.5 seconds in 95% of cases.

### 1.2 Concurrent Usage
- THE system SHALL support a minimum of 1,000 concurrent active users without degradation in the above response times.
- WHERE traffic spikes (such as trending news or breaking political events) occur, THE system SHALL sustain peak loads up to 10,000 concurrent sessions, maintaining above 90% of stated response time targets.
- IF incoming requests exceed maximum threshold (over 10,000 concurrent), THEN THE system SHALL implement fair request throttling and provide a standard service busy message.

## 2. Scalability Provisions
- THE system SHALL be designed for horizontal scalability, supporting seamless recovery and performance maintenance as the active user base expands from hundreds to hundreds of thousands of daily users within one year of launch.
- WHERE new discussion categories or viral topic clusters emerge, THE system SHALL dynamically allocate resources to balance load and preserve user experience.
- WHEN rapid growth results in a doubling of active users within a month, THE system SHALL auto-scale core resources within 5 minutes to maintain operational targets.

## 3. Reliability and Availability Expectations
- THE system SHALL achieve 99.9% uptime over a rolling 30-day window, excluding scheduled maintenance (which must be communicated to users with 24-hour notice).
- WHEN an outage or critical service interruption occurs, THE system SHALL recover core user posting and viewing functions within 20 minutes (MTTR).
- THE system SHALL preserve all user-generated data (posts, comments, votes, moderation events) with a near-zero risk of data loss during disasters or recovery.
- THE system SHALL maintain transactional integrity for posting, commenting, voting, reporting, and moderation events under all expected error and failure scenarios.

## 4. Data Privacy and Regulatory Compliance
### 4.1 Privacy Commitments
- THE system SHALL collect, process, and store only the minimum data required for account management, service improvement, community moderation, and legal compliance.
- WHERE personal data (including user profiles, IP addresses, behavioral logs) is stored, THE system SHALL protect such data in transit and at rest using industry-standard protections.
- THE system SHALL honor verified user requests for account erasure and provide a summary of retained data in a privacy dashboard upon request within 10 days.
- WHERE applicable, THE system SHALL facilitate user data portability in a machine-readable format within 30 days of a verified request.

### 4.2 Regulatory and Consent Management
- THE system SHALL comply with all regional data protection, privacy, and platform governance laws (e.g., GDPR, CCPA, and equivalents in the primary market of operation).
- WHEN new legal or regulatory requirements arise, THE system SHALL implement required changes within 60 days of formal notification.
- THE system SHALL obtain explicit user consent for any processing of personal data outside core service delivery, and log all such consents for at least 2 years.
  
## 5. Security Targets
- THE system SHALL use JWT-based authentication for all role-protected operations, with strict session management and time-based token expiry.
- THE system SHALL implement role-based access control aligned precisely to defined roles (visitor, user, moderator, admin), preventing privilege escalation or unauthorized access to data or features.
- WHEN repeated failed authentication or suspicious activity is detected (e.g., brute force attempts, unusual location), THE system SHALL lock the affected account/session and alert admin roles in real time.
- THE system SHALL ensure all user-facing and API endpoints are protected from common vulnerabilities (including but not limited to XSS, CSRF, SQL injection, privilege escalation via direct object reference, and broken authentication flows).
- WHERE 3rd party integrations (such as OAuth providers or analytics platforms) are used, THE system SHALL ensure token and user data security meet or exceed platform internal standards. Integrations with lower compliance must be sandboxed or restricted from sensitive data access.
- WHERE vulnerabilities or critical security bugs are discovered, THE system SHALL patch production within a 7-day window, or within 24 hours for actively exploited issues.

## 6. Global Non-Functional Constraints
- THE document strictly prohibits specifying any technical implementation details, such as frameworks, server choices, or infrastructure configurations; all requirements are stated in natural language.
- All non-functional requirements herein are binding for backend development and form part of success metrics for acceptance of delivered features.

## Appendix
### Related Links
- For functional and business requirements, refer to the [Functional Requirements Document](./04-functional-requirements.md).
- For user role and security policy reference, see the [User Roles and Authentication Requirements](./02-user-roles-and-authentication.md).
- Details on error and incident handling are defined in the [Error Handling and Recovery Policy](./10-error-handling-and-recovery.md).

