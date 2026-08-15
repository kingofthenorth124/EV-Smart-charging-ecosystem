# Enterprise Business Rules
## Smart EV Charging Payment Platform

This document defines the authoritative business rules governing customers, NFC/RFID access, wallets, payments, charging sessions, registration, authorization, transactions, integrations, APIs, events, and administrative controls.

All modules must comply with these rules.

Business rules shall be enforced primarily in the backend domain layer. Frontend validation may improve user experience but shall never replace backend enforcement.

# Customer Registration

The platform shall support hybrid customer registration.

A customer may initiate registration through the customer-facing application.

An authorized administrative officer may also perform initial registration on behalf of a customer.

Both registration channels shall use the same backend registration domain services, validation rules, identity model, and audit mechanisms.

The system shall prevent duplicate customer identities based on configured unique identifiers such as verified phone number, email address, or other approved identity attributes.

Administrative registration shall record the responsible officer.

Customer self-registration shall record the originating channel.

Registration status shall be explicitly tracked.

Possible registration states may include:

- Pending
- Active
- Suspended
- Deactivated

A customer shall not be authorized to charge until all mandatory registration and access requirements have been satisfied.

# NFC/RFID Access

Each physical NFC/RFID card shall have a unique identifier.

A card shall be linked to a customer profile before it can authorize charging.

A card shall have an explicit lifecycle status.

Supported states shall include, where applicable:

- Unassigned
- Active
- Suspended
- Lost
- Replaced
- Revoked

A lost or compromised card shall be capable of immediate suspension.

A replacement card shall receive a new physical identifier while maintaining the appropriate customer relationship and audit history.

A revoked card shall never authorize a charging session.

Card assignment, suspension, replacement, and revocation shall be auditable.

The platform shall not store sensitive payment credentials on an NFC/RFID card.

# Customer and Access Authorization

Every charging authorization request shall resolve to a valid customer or approved access identity.

The platform shall verify:

- Customer status
- Card/access status
- Wallet status
- Available balance
- Applicable business restrictions
- Station and connector availability
- Charging authorization rules

Authorization shall be rejected when mandatory conditions are not satisfied.

Authorization decisions shall be recorded for auditability.

# Minimum Wallet Balance

The platform shall enforce the configured minimum wallet balance required for charging authorization.

The initial business policy requires a minimum available wallet balance of:

*₦50,000*

The value shall be configurable through authorized administrative controls rather than hardcoded throughout application code.

A customer whose available balance is below the required minimum shall not be authorized to start a charging session.

The backend shall remain the authoritative source for authorization.

# Wallet

Each customer shall have an identifiable wallet.

Wallet balances shall be maintained using reliable transactional database operations.

Wallet operations shall be represented by immutable financial transactions or an equivalent auditable ledger mechanism.

The system shall distinguish between:

- Available balance
- Held/reserved amount
- Debited amount
- Credited amount
- Refunded amount

Negative wallet balances shall not be permitted unless an explicitly approved business policy introduces controlled credit functionality.

Concurrent wallet operations shall be protected against race conditions and double spending.

# Wallet Top-Up

The minimum customer wallet top-up amount shall initially be:

*₦50,000*

Top-ups below the configured minimum shall be rejected.

Supported payment channels may include:

- Paystack
- Bank transfer
- Card
- USSD
- Other approved payment providers

Payment-provider confirmation shall be required before a successful top-up is credited.

Client-side payment success shall never be treated as sufficient proof of settlement.

Webhook or server-to-server verification shall be used where supported.

Duplicate payment notifications shall be handled idempotently.

A successful top-up shall produce an auditable wallet transaction.

# Payments

Payment processing shall be separated from wallet accounting.

The platform shall maintain payment transaction identifiers and provider references.

Payment states shall be explicitly tracked.

Typical states include:

- Initiated
- Pending
- Successful
- Failed
- Reversed
- Refunded

Payment operations shall be idempotent.

The same provider callback shall not credit the wallet more than once.

Failed payments shall not increase the wallet balance.

Refunds and reversals shall create appropriate financial records.

# Charging Authorization

A charging session shall not begin until the authorization process succeeds.

Authorization shall verify the customer's access identity and applicable wallet/business requirements.

For OCPP charging, the platform shall support the appropriate authorization flow for the configured OCPP version.

The authorization decision shall be returned to the charging infrastructure within the required protocol constraints.

# Charging Sessions

Every charging session shall have a unique identifier.

A session shall record, where applicable:

- Customer
- Access identifier
- Charge point
- Connector
- Start time
- Stop time
- Meter readings
- Energy consumed
- Applicable tariff
- Session cost
- Payment/wallet references
- Session status

Session state transitions shall be controlled by domain rules.

A charging session shall not be silently created, modified, or closed from the frontend.

OCPP messages shall be treated as external protocol events and validated before affecting domain state.

# Metering and Charging Cost

Meter values received from charging infrastructure shall be validated.

Charging cost shall be calculated using the applicable tariff and authoritative metering information.

The frontend shall not determine the final charging cost.

The backend shall remain authoritative for:

- Energy consumed
- Tariff
- Session cost
- Wallet debit

Session settlement shall be idempotent.

# OCPP

The platform shall support OCPP 1.6J and maintain architectural readiness for OCPP 2.0.1.

OCPP communication shall be isolated behind appropriate protocol/domain boundaries.

OCPP transport concerns shall not be embedded directly into wallet or payment business logic.

OCPP events and commands shall be traceable.

Charging protocol failures shall not corrupt wallet accounting.

# Transactions and Ledger

Financial transactions shall be immutable after posting except through controlled reversal, refund, or adjustment operations.

Every financial transaction shall have a unique identifier.

Transactions shall record sufficient information for reconciliation and audit.

The system shall maintain traceability between:

Payment → Wallet Transaction → Charging Session

Where applicable.

# Idempotency

All externally retriable financial operations shall support idempotency.

This includes, where applicable:

- Payment requests
- Payment webhooks
- Wallet credits
- Wallet debits
- Charging settlement
- External API requests
- Event processing

Repeated delivery of the same operation shall not produce duplicate financial effects.

# API-First Integration

Enterprise domains shall expose stable APIs.

APIs shall have:

- Explicit contracts
- Authentication
- Authorization
- Versioning
- Validation
- Rate limiting where appropriate
- Error standards
- Auditability
- Documentation

External integrations shall interact through supported API contracts rather than direct database access.

# API Contract Management

API contracts shall be treated as first-class enterprise assets.

The lifecycle shall be:

Design API → Define Contract → Build → Test → Approve → Version → Publish → Monitor → Deprecate

Breaking changes shall require an explicit versioning strategy.

Existing consumers shall not be broken without an approved migration and deprecation process.

# Developer Portal and Sandbox

The platform shall provide an external developer portal for approved API consumers.

The developer portal shall provide access to:

- API documentation
- API versions
- Authentication instructions
- SDKs where available
- Webhook documentation
- Event documentation
- Sandbox information
- Usage guidance
- API lifecycle information

The sandbox shall provide a controlled environment for integration testing without affecting production data.

Sandbox credentials shall be separate from production credentials.

Production access shall require appropriate approval and security controls.

# Event-Driven Integration

Important domain changes shall be capable of being published as domain events.

Event contracts shall be explicitly defined and versioned.

The event lifecycle shall be:

Define Event → Version Schema → Publish → Consume → Monitor → Retry → Dead-Letter → Deprecate

Events shall contain sufficient metadata for tracing, correlation, and processing.

Consumers shall process events idempotently.

Failed event processing shall support controlled retries and dead-letter handling.

# External Integrations

External systems shall integrate through APIs, events, webhooks, or approved integration mechanisms.

External integrations shall not require modification of core domain logic for ordinary contract-compatible changes.

Integration failures shall be isolated and observable.

Third-party systems shall not receive unrestricted database access.

# Super Admin Governance

Super Admin functionality shall control approved enterprise configuration rather than bypassing domain rules.

Authorized administrative controls may include:

- Business policies
- Minimum wallet balance
- Top-up limits
- Tariffs
- API clients
- Developer access
- Sandbox configuration
- API versions
- Event contracts
- Feature flags
- Access policies
- Integration configuration

Administrative changes shall be permission-controlled and audited.

# Auditability

Security-sensitive and business-critical actions shall generate audit records.

Audit events shall include appropriate information such as:

- Actor
- Action
- Resource
- Timestamp
- Result
- Correlation identifier
- Relevant metadata

Audit records shall not expose secrets or sensitive credentials.

# Data Ownership

Each enterprise domain shall own its authoritative data.

Other domains shall access that data through approved APIs or domain events.

Direct cross-domain database writes are prohibited unless explicitly approved as an infrastructure-level exception.

# Security

Authentication and authorization shall be enforced server-side.

Role-Based Access Control shall be applied to protected operations.

Sensitive data shall be protected in transit and at rest where applicable.

Secrets shall never be stored in source code.

# Business Rule Governance

Business rules shall be centralized, documented, version-controlled, testable, and auditable.

Changes to critical business rules shall undergo appropriate review and testing.

No frontend implementation shall override backend business rules.

# Rule Priority

When conflicting requirements occur, the following priority applies:

1. Security and regulatory requirements
2. Financial integrity
3. Explicit approved business rules
4. Domain invariants
5. API and event contracts
6. User-interface behavior

The backend domain model is the final authority for business-rule enforcement.