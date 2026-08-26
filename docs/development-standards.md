# Enterprise Development Standards

## Smart EV Charging Payment Platform

This document defines the engineering, coding, testing, security, integration, deployment, documentation, and operational standards governing every module of the Smart EV Charging Payment Platform.

This document is authoritative for implementation standards.

Replit Agent shall follow this document together with:

- /docs/architecture.md
- /docs/business-rule.md
- /docs/ui-ux-reference.md

No module may override these standards without an explicitly documented architectural decision.

# Development Methodology

Development shall be incremental and module-driven.

Do not attempt to generate the entire platform at once.

Each module shall be developed as a complete production-ready vertical slice containing, where applicable:

- Business implementation
- Domain logic
- Database schema
- REST APIs
- WebSocket functionality
- Domain events
- Event consumers and publishers
- Shared TypeScript contracts
- React frontend
- Backend integration
- Validation
- Authorization
- Automated tests
- Documentation
- Monitoring
- Deployment configuration

A module is not complete until its acceptance criteria are satisfied.

Do not begin the next module until the current module has passed all required validation.

# Production Monorepo Standard

Maintain one production-ready monorepo.

The repository shall maintain the following major structure:

- apps/web — React frontend
- apps/api — NestJS backend
- packages/shared-types — shared TypeScript contracts
- packages/ui — reusable frontend components
- packages/config — shared configuration
- packages/utils — shared utilities
- packages/auth — authentication and authorization utilities
- packages/validation — shared validation schemas
- packages/sdk — external and platform SDKs
- prisma — database schema and migrations
- infrastructure — AWS and infrastructure configuration
- tests — cross-module and end-to-end testing
- scripts — development and operational scripts
- docs — authoritative project documentation
- .github/workflows — CI/CD workflows

Do not create duplicate application structures.

Do not create separate repositories for individual modules unless explicitly approved by the architecture.

Preserve completed functionality when implementing new modules.

# Module Development Standard

Every module shall be treated as an independently validated vertical slice.

Before implementation:

- Read the architecture document.
- Read the business-rules document.
- Read this development-standards document.
- Read the UI/UX reference where the module has a frontend.
- Inspect the existing repository.
- Identify completed modules.
- Identify dependencies.
- Identify existing services.
- Identify existing API contracts.
- Identify existing event contracts.
- Verify that the existing application builds successfully.

During implementation:

- Reuse existing services where appropriate.
- Extend existing contracts instead of duplicating them.
- Maintain backward compatibility.
- Implement backend and frontend together.
- Implement database changes through migrations.
- Implement validation on both frontend and backend.
- Implement authorization on the backend as the source of truth.
- Keep business logic outside React components.
- Maintain domain boundaries.
- Avoid unnecessary coupling between modules.

After implementation:

- Run compilation.
- Run linting.
- Run formatting validation.
- Run unit tests.
- Run integration tests.
- Run API contract tests.
- Run end-to-end tests where applicable.
- Run WebSocket tests where applicable.
- Validate database migrations.
- Validate security controls.
- Validate CI/CD.
- Update documentation.
- Verify deployment readiness.

# Frontend and Backend Synchronization

The React frontend and NestJS backend shall always progress together.

Every frontend feature shall consume live backend functionality.

Every backend feature requiring user interaction shall have the corresponding frontend workflow where applicable.

Frontend and backend shall communicate through:

- REST APIs
- Secure WebSockets where required
- Shared TypeScript contracts
- Versioned API contracts
- Versioned event contracts

Do not use mock data.

Do not use placeholder business data.

Do not hardcode production business values into React components.

Frontend forms, tables, dashboards, wallet balances, charging sessions, transactions, stations, users, cards, payments and other business information shall come from backend APIs.

# UI/UX Implementation Standard

The supplied Camel Mobility Wallet UI/UX reference is a design reference and not production implementation code.

Replit Agent shall convert the reference into production-ready:

- React
- TypeScript
- React Router
- Reusable components
- React hooks
- Shared contracts
- Centralized API services
- Backend-connected workflows

Preserve the approved visual language, including where applicable:

- Layout
- Navigation
- Typography
- Colors
- Spacing
- Cards
- Wallet presentation
- NFC card experience
- Charging experience
- Top-up experience
- Transaction history
- Registration experience
- Responsive behavior
- Interaction patterns

Improve accessibility, usability and responsiveness where necessary without unnecessarily changing the approved design.

Business logic shall not be embedded inside presentation components.

# API-First Development

Every enterprise domain shall expose stable APIs where external or internal consumers require access.

APIs shall have:

- Clear ownership
- Defined resources
- Explicit request and response schemas
- Authentication
- Authorization
- Validation
- Error contracts
- Idempotency where required
- Rate limiting where required
- Auditability
- Versioning
- Documentation

APIs shall be designed before dependent consumers are implemented.

API contracts shall be treated as controlled enterprise interfaces.

# API Contract Management

API Contract Management shall be a first-class platform capability.

The lifecycle shall be:

Design API → Define Contract → Validate → Build → Test → Approve → Version → Publish → Monitor → Deprecate

API contracts shall define:

- Endpoints
- HTTP methods
- Request schemas
- Response schemas
- Authentication requirements
- Authorization requirements
- Error responses
- Pagination
- Filtering
- Idempotency
- Rate limits
- Version information

Use OpenAPI/Swagger as the authoritative REST API description.

Breaking API changes shall require a new version or an explicitly approved compatibility strategy.

Existing consumers shall not be broken without controlled migration and deprecation procedures.

# Developer Portal

The Developer Portal shall be treated as a first-class enterprise integration capability.

It shall provide authorized external developers with controlled access to platform integration resources.

The Developer Portal shall support, where applicable:

- Developer registration
- Organization registration
- Application registration
- API documentation
- API discovery
- API version information
- Authentication setup
- API key management
- OAuth configuration
- Webhook configuration
- SDK access
- API examples
- Usage information
- Rate-limit information
- Integration guides
- Sandbox access
- API lifecycle information
- Deprecation notices

The Developer Portal may be exposed through a dedicated subdomain such as:

developers.example.com

It shall remain securely integrated with the core platform.

The Developer Portal shall never bypass core authentication, authorization, API governance or security controls.

# Sandbox Environment

Sandbox shall be a first-class platform capability.

External developers shall be able to test integrations without interacting with production business data or production financial transactions.

Sandbox shall provide:

- Isolated test environment
- Test credentials
- Test API keys
- Test OAuth applications
- Test webhook endpoints
- Test API data
- Test event flows
- Controlled test charging scenarios
- Test payment workflows where applicable
- Documentation
- Resettable test state

Sandbox data shall never be confused with production data.

Production credentials shall never be accepted by sandbox endpoints.

Sandbox shall not provide uncontrolled access to production systems.

# API Integration Lifecycle

External integrations shall follow a controlled lifecycle:

Discover API → Register Application → Obtain Credentials → Access Sandbox → Test Contract → Validate Integration → Request Approval → Obtain Production Access → Monitor Usage → Manage Versions → Migrate Before Deprecation

External systems shall integrate through documented APIs and events rather than directly accessing core databases.

No external system shall receive direct database access to core transactional data.

# Event-Driven Development

Domain events shall be first-class enterprise contracts.

Events shall be published when significant domain state changes occur.

Examples include:

- CustomerRegistered
- NFCCardRegistered
- NFCCardLinked
- WalletFunded
- ChargingSessionStarted
- MeterValueReceived
- ChargingSessionStopped
- PaymentCompleted
- PaymentFailed
- APIApplicationCreated
- APIContractPublished

Events shall contain:

- Event identifier
- Event type
- Event version
- Timestamp
- Source
- Correlation identifier
- Causation identifier where applicable
- Tenant or organization context where applicable
- Structured event payload
- Schema information

# Event Contract Management

Event Contract Management shall be a first-class capability.

The lifecycle shall be:

Define Event → Version Schema → Validate → Publish → Consume → Monitor → Retry → Dead-Letter → Deprecate

Event contracts shall be versioned.

Consumers shall not depend on undocumented event fields.

Breaking event changes shall require a new event version or controlled compatibility strategy.

Event consumers shall be designed to tolerate retries and duplicate delivery where applicable.

# Event Reliability

Event-driven workflows shall support:

- Idempotent consumers
- Retry policies
- Dead-letter queues
- Correlation identifiers
- Failure monitoring
- Event tracing
- Event versioning
- Schema validation
- Replay strategies where required

Amazon EventBridge, Amazon SQS and Amazon SNS shall be used according to the architecture.

Critical transactional workflows shall not depend on unreliable fire-and-forget processing.

# Shared Contracts

Shared contracts shall be maintained in:

packages/shared-types

Contracts shall be reused by frontend and backend where appropriate.

Shared contracts may include:

- API request types
- API response types
- Domain types
- Event types
- Enumerations
- Pagination contracts
- Error contracts

Do not duplicate identical TypeScript interfaces across applications.

Contract changes shall be reviewed for backward compatibility.

# Validation Standard

Validation shall occur at system boundaries.

Frontend validation shall provide immediate user feedback.

Backend validation shall remain authoritative.

Validate:

- Request payloads
- Query parameters
- Path parameters
- Authentication information
- Authorization context
- Financial values
- NFC identifiers
- OCPP messages
- Event payloads
- External API responses

Never rely exclusively on frontend validation for security or business rules.

# Authentication and Authorization

Security shall follow least-privilege principles.

The backend shall be the authoritative enforcement point for authorization.

The platform shall support role-based access control where required.

Authorization shall consider:

- User identity
- Role
- Organization
- Resource ownership
- Permission
- API scope
- Environment

Frontend authorization shall improve user experience but shall never replace backend authorization.

# Security by Design

Security shall be incorporated into every module.

Requirements include:

- No hardcoded secrets
- Secure authentication
- Secure authorization
- Input validation
- Output validation where required
- Encryption in transit
- Encryption at rest where applicable
- Secure password handling
- Secure token handling
- Rate limiting
- Audit logging
- Security headers
- Dependency scanning
- Secret scanning
- SAST
- Container scanning

Sensitive information shall never be written to application logs.

# Secrets and Configuration

No secrets shall be hardcoded.

Development shall use environment variables or approved local secret mechanisms.

Production secrets shall use AWS Secrets Manager or an approved AWS secret-management mechanism.

CI/CD shall inject secrets securely.

Never commit:

- Passwords
- API keys
- Private keys
- Payment credentials
- Database credentials
- OAuth secrets
- Production tokens

# Database Standards

PostgreSQL shall be the primary transactional database.

Prisma shall be used as the ORM unless an approved architectural decision states otherwise.

Database changes shall use migrations.

Never modify production schema manually as part of normal deployment.

Database design shall maintain:

- Referential integrity
- Appropriate indexes
- Constraints
- Transaction boundaries
- Auditability
- Data ownership
- Appropriate normalization
- Performance considerations

Financial transactions shall maintain strong consistency and appropriate transactional guarantees.

# Payment Standards

Payment integrations shall be treated as financial systems.

Payment workflows shall support:

- Idempotency
- Transaction references
- Payment status lifecycle
- Verification
- Reconciliation
- Failure handling
- Webhook validation
- Audit trails
- Duplicate protection

Payment providers may include:

- Paystack
- OPay
- Moniepoint
- Other approved providers

Never consider a client-side payment response sufficient proof of successful payment.

Payment status shall be verified through trusted backend mechanisms.

# Wallet Standards

Wallet operations shall maintain financial integrity.

Wallet transactions shall be auditable.

Balance-changing operations shall be atomic.

The platform shall prevent:

- Double charging
- Duplicate wallet credits
- Duplicate wallet debits
- Negative balances where prohibited
- Unverified payment credits
- Unauthorized balance modifications

All wallet adjustments shall have traceable transaction references.

# NFC/RFID Standards

NFC/RFID identifiers shall be treated as security-sensitive access credentials.

The platform shall support the approved hybrid registration model where applicable:

- Customer-initiated registration
- Authorized admin-officer registration

The registration process shall ensure:

- Unique customer identity
- Unique card identity
- Secure card linking
- Authorization
- Card status management
- Replacement of lost cards
- Suspension of compromised cards
- Audit trails

A card shall not be linked to multiple active customer profiles unless explicitly permitted by business rules.

# OCPP Standards

The charging platform shall support OCPP 1.6J and maintain architecture readiness for OCPP 2.0.1.

OCPP communication shall be handled through the dedicated charging integration architecture.

Charging workflows shall support where applicable:

- Charger registration
- Charger connectivity
- Authorization
- Start transaction
- Meter values
- Stop transaction
- Charging status
- Fault handling
- Session lifecycle
- Reconciliation

OCPP messages shall be validated before being accepted into the domain.

OCPP communication shall not directly manipulate wallet balances without passing through the appropriate domain and payment controls.

# Observability

Every production module shall provide appropriate:

- Structured logging
- Metrics
- Tracing where applicable
- Health checks
- Error monitoring
- Operational dashboards

AWS CloudWatch shall be used for production monitoring where appropriate.

Logs shall contain correlation information while avoiding sensitive data.

# AWS Deployment Standard

Production deployment shall target AWS.

The platform shall support:

- Docker
- Amazon ECS with Fargate
- Amazon RDS PostgreSQL
- Amazon ElastiCache Redis
- Amazon EventBridge
- Amazon SQS
- Amazon SNS
- Amazon S3
- AWS Secrets Manager
- Amazon CloudWatch
- Amazon ECR

Infrastructure shall be reproducible through Infrastructure as Code.

Modules shall be deployable without major architectural refactoring.

# CI/CD Standard

Every module shall pass the enterprise CI/CD pipeline before acceptance.

The pipeline shall include where applicable:

- Dependency installation
- TypeScript compilation
- Linting
- Formatting validation
- Unit tests
- Integration tests
- API contract tests
- End-to-end tests
- WebSocket tests
- Database migration validation
- SAST
- Dependency vulnerability scanning
- Secret scanning
- Container image scanning
- Infrastructure validation
- Docker build
- Container versioning
- Amazon ECR publishing
- Deployment validation
- Health checks
- Smoke tests
- Rollback validation

Deployments shall use controlled release strategies such as rolling or blue/green deployment where appropriate.

# Version Control

Every completed module shall represent a controlled development milestone.

Changes shall clearly identify:

- Architectural changes
- Database changes
- API changes
- Event changes
- Infrastructure changes
- Configuration changes
- Security changes
- Documentation changes

Use semantic versioning where applicable.

# Documentation Standard

Documentation shall remain synchronized with implementation.

Each completed module shall update applicable:

- Architecture documentation
- API documentation
- OpenAPI specification
- API Catalog
- Event Catalog
- Event schemas
- Data Dictionary
- ADRs
- Deployment documentation
- Environment variable documentation
- Operational runbooks
- Security documentation
- Release notes
- Rollback procedures

Documentation changes are part of module completion and shall not be postponed.

# Automated Testing Standard

Testing shall be performed continuously.

Use appropriate:

- Unit tests
- Integration tests
- API contract tests
- Database tests
- Event tests
- WebSocket tests
- Security tests
- End-to-end tests

Tests shall verify both successful and failure scenarios.

Business-critical workflows shall have automated regression coverage.

# Error Handling

Errors shall use consistent contracts.

API errors shall provide appropriate:

- Error code
- Human-readable message
- HTTP status
- Correlation identifier
- Validation details where applicable

Do not expose internal stack traces, secrets or sensitive infrastructure information to clients.

# Performance and Scalability

Design modules for horizontal scalability where appropriate.

Avoid:

- Unnecessary synchronous dependencies
- Blocking operations
- Unbounded queries
- Uncontrolled retries
- Memory leaks
- Duplicate processing

Use Redis, queues and asynchronous processing where justified by the architecture.

# Backward Compatibility

Existing functionality shall not be broken unnecessarily.

Before changing an existing API, event or shared contract:

- Identify consumers.
- Assess compatibility.
- Determine whether the change is breaking.
- Introduce a version where necessary.
- Provide migration guidance.
- Define deprecation timelines where applicable.

# Replit Development Standard

Replit is the development environment.

Replit Agent shall maintain the repository as a real production-oriented monorepo rather than a prototype.

Before making changes, inspect the existing repository.

Do not recreate files that already exist.

Do not overwrite completed modules without justification.

Do not create mock implementations merely to make tests pass.

Do not leave TODO implementations in production functionality.

Keep the project compiling after changes.

# AI Development Rules

Replit Agent shall:

- Read the authoritative project documents before implementation.
- Analyze existing code before modifying it.
- Identify dependencies before implementing a module.
- Explain significant architectural decisions.
- Follow established naming conventions.
- Reuse existing services and contracts.
- Avoid duplicate implementations.
- Maintain domain boundaries.
- Maintain backward compatibility where practical.
- Implement real functionality.
- Never use mock business data.
- Never use placeholder production functionality.
- Never bypass security controls.
- Never bypass business rules.
- Never bypass API contracts.
- Never bypass event contracts.
- Never expose direct database access to external systems.
- Never proceed to the next module when acceptance criteria remain unmet.

# Module Completion Standard

A module shall be considered complete only when:

- Business requirements are implemented.
- Business rules are enforced.
- Architecture is consistent with the authoritative architecture document.
- Database schema and migrations are complete.
- REST APIs are implemented and documented.
- API contracts are complete.
- Event contracts are complete where applicable.
- WebSocket functionality is complete where applicable.
- Frontend functionality is implemented where applicable.
- Frontend and backend are synchronized.
- No mock or placeholder business data remains.
- Authentication and authorization are verified.
- Security controls are verified.
- Automated tests pass.
- Database migrations pass.
- CI/CD validation passes.
- Monitoring and logging are configured.
- Documentation is updated.
- Deployment configuration is complete.
- The repository builds successfully.
- The module is deployable to AWS without major refactoring.
- All module acceptance criteria are satisfied.

# Technology Standards

The primary technology stack shall be:

- Node.js 22 LTS
- TypeScript
- NestJS
- React
- React Router
- PostgreSQL
- Prisma
- Redis
- Docker
- Amazon ECS Fargate
- Amazon RDS
- Amazon ElastiCache
- Amazon EventBridge
- Amazon SQS
- Amazon SNS
- Amazon S3
- AWS Secrets Manager
- Amazon CloudWatch
- Amazon ECR
- Paystack
- OCPP 1.6J
- OCPP 2.0.1 architectural readiness

# Engineering Principles

All development shall follow:

- Clean Architecture
- Domain-Driven Design
- SOLID principles
- API-First Design
- Contract-First Development
- Event-Driven Architecture
- Security by Design
- Least Privilege
- Twelve-Factor principles where applicable
- Infrastructure as Code
- Automated Testing
- Continuous Integration
- Continuous Delivery
- Observability
- Backward Compatibility

# Authoritative Development Rule

The platform shall be developed as a controlled enterprise system rather than as a collection of independent prototypes.

The required development lifecycle is:

Understand Requirements → Inspect Existing System → Design → Define Contracts → Implement Backend → Implement Events → Implement Frontend → Integrate → Test → Secure → Document → Validate CI/CD → Deploy → Monitor

For external integrations, the lifecycle is:

Design API → Define Contract → Build → Sandbox → Test → Approve → Version → Publish → Monitor → Deprecate

For event integrations, the lifecycle is:

Define Event → Version Schema → Publish → Consume → Monitor → Retry → Dead-Letter → Deprecate

No module shall bypass these controlled development processes.
