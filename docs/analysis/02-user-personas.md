# User Personas for discussBoard

## Persona Overview
User personas define the key archetypes using the discussBoard platform, shaping product design, requirements, and business rules. These personas reflect the real-world roles—Guest, Member, Moderator, Administrator—describing their unique needs, behaviors, motivations, and the strategic value they generate for the service. Understanding these personas aligns feature design and access control with actual user journeys and market needs.

## Primary User Archetypes

### 1. Guest
- **Description:** Non-authenticated users browsing the platform.
- **Demographics:** Any age or background; likely includes students, journalists, passive readers, or those evaluating the community before registering.
- **Typical Behaviors:** View public discussions, search for political/economic topics, consume content passively.
- **Value:** Contributes to public visibility, increases pageviews/SEO, possible conversion to registered Member.

### 2. Member
- **Description:** Registered, authenticated users participating actively in discussion.
- **Demographics:** Adults interested in politics or economics; from enthusiasts to domain experts; includes students, advocates, and general public.
- **Typical Behaviors:** Create/submit posts, comment on discussions, like/dislike contributions, report problematic content, manage own profile/settings.
- **Value:** Drives platform engagement, content creation, and community vibrancy.

### 3. Moderator
- **Description:** Trusted Members elevated to enforce standards, review reports, and moderate disputes.
- **Demographics:** Experienced, credible Members recognized for fairness and participation; may possess subject-matter expertise or leadership traits.
- **Typical Behaviors:** Review and act upon content reports, edit/remove posts or comments as per policy, mediate disputes, provide user feedback, escalate to Admin if needed.
- **Value:** Upholds community guidelines, ensures content quality, reduces staff workload, builds trust.

### 4. Administrator
- **Description:** Platform stewards with comprehensive oversight—site owners, legal/compliance officials, lead operators, or technical managers.
- **Demographics:** Organization staff/owners, sometimes community leaders.
- **Typical Behaviors:** Configure roles/policies, audit moderation, set site-wide rules, manage incidents or compliance risks.
- **Value:** Guarantee platform integrity, legal compliance, and ongoing alignment with mission/vision.

## Persona Motivations and Needs

| Persona       | Motivations                                  | Needs                                              |
|--------------|----------------------------------------------|----------------------------------------------------|
| Guest        | Access to information; safe, open exploration | Unrestricted public content; privacy; onboarding    |
| Member       | Expression; dialogue; reputation; belonging   | Security, fair moderation, robust features          |
| Moderator    | Community stewardship, influence, fairness    | Moderation tooling, policy guidance, admin support  |
| Administrator| Oversight, trust, growth, compliance          | Full controls, auditing, scalability, legal safety  |

## Persona Pain Points and Goals

### Guest
- **Pain Points:** Blocked features (cannot post/comment/react), privacy uncertainty, unclear value for registration.
- **Goals:** Rapid assessment, credible content, minimal barriers to try or join.

### Member
- **Pain Points:** Harassment/exclusion, unclear moderation rules, friction editing profile, lack of feedback/recognition.
- **Goals:** Respectful exchange, account tools, fair/clear moderation, growth/recognition.

### Moderator
- **Pain Points:** Incomplete tools, lack of clarity on policy, emotional stress from disputes, little opportunity for admin feedback.
- **Goals:** Effective, accountable moderation; support in upholding standards; transparent escalation/appeals.

### Administrator
- **Pain Points:** Policy confusion, legal exposure, scaling issues, limited insight into emerging risks, platform downtime.
- **Goals:** Platform stability, regulatory compliance, flexible policy enforcement, high community trust.

## Business Role Mapping & Permissions

| Feature/Action                    | Guest | Member | Moderator | Administrator |
|-----------------------------------|:-----:|:------:|:---------:|:-------------:|
| View public posts/comments        |  ✅   |   ✅   |    ✅     |      ✅       |
| Register/login                    |  ✅   |   ❌   |    ❌     |      ❌       |
| Create/edit/delete own content    |  ❌   |   ✅   |    ✅     |      ✅       |
| Like/dislike/report content       |  ❌   |   ✅   |    ✅     |      ✅       |
| Moderate/edit/delete all content  |  ❌   |   ❌   |    ✅     |      ✅       |
| Ban/suspend users                 |  ❌   |   ❌   |    ✅     |      ✅       |
| Assign/revoke permissions/roles   |  ❌   |   ❌   |    ❌     |      ✅       |
| Configure platform policies       |  ❌   |   ❌   |    ❌     |      ✅       |

## Error and Edge Scenarios (Business Logic in EARS Format)

- IF a Guest attempts Member-only actions (e.g., posting, commenting), THEN THE system SHALL deny the action and prompt to register or log in.
- IF a Member attempts Moderator privileges (e.g., edit/remove others’ posts), THEN THE system SHALL deny, display an explanation, and log the attempt for audit.
- IF a Moderator exceeds authority (e.g., assign roles, change platform policy), THEN THE system SHALL return error, inform Moderator, escalate to Administrator, and log the incident for internal review.
- IF an Administrator makes high-impact policy/configuration changes, THEN THE system SHALL prompt for confirmation, log the change, and notify relevant staff or stakeholders.
- WHEN a Member’s account is suspended or banned, THE system SHALL block all privileged actions, displaying the reason and duration as required by policy.
- IF a Guest or Member repeatedly attempts forbidden actions (e.g., account brute-force, spam reports), THEN THE system SHALL escalate rate-limiting or present a CAPTCHA challenge.

## Cross-referencing Related Documents
- User role permission logic and escalation: See [User Roles and Permissions Specification](./03-user-roles-and-permissions.md)
- Workflow, edge cases, onboarding: See [User Journey and Flow Specification](./05-user-journey-and-flow.md)
- Moderation/Appeals: See [Moderation and Enforcement Requirements](./06-moderation-and-enforcement.md)

## Summary
Well-defined, business-driven personas directly shape access control, workflow design, error handling, and long-term value for the discussBoard. These personas map onto system roles to ensure requirements remain actionable, inclusive, and growth-oriented for all stakeholders.