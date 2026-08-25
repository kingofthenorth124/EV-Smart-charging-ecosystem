# Camel Mobility Wallet UI/UX Reference

# Purpose

This document is the authoritative UI/UX, frontend design, interaction, accessibility, responsive-design, and frontend-integration reference for the Camel Mobility Wallet.

The supplied HTML/CSS/JavaScript is a design reference only.

Do not use the supplied implementation directly in production.

Convert the design into a production-ready React + TypeScript frontend using:

- React
- TypeScript
- React Router
- Reusable components
- React hooks
- Shared TypeScript contracts
- Centralized API services
- Backend-connected workflows
- Enterprise authentication and authorization
- Automated frontend testing

Preserve the intended visual design and user experience while replacing prototype implementation logic with production architecture.

# Design Reference Source

The raw HTML/CSS/JavaScript supplied by the project owner shall be stored separately at:

docs/ui-ux-reference-source.html

This file is a visual and interaction reference only.

It must not be imported into the production React application.

It must not be copied directly into production.

It must not be treated as the frontend architecture.

Replit Agent shall inspect the source and translate its visual and interaction requirements into reusable React components.

# Design Objectives

The production frontend shall preserve the intended:

- Camel Mobility Wallet identity
- Green and amber visual language
- Dashboard structure
- Navigation structure
- Wallet experience
- NFC card experience
- Charging experience
- Top-up experience
- Transaction history
- Registration experience
- Station selection experience
- Status indicators
- Notifications
- Responsive behavior
- Interaction patterns

The production implementation may improve the design where necessary for:

- Accessibility
- Security
- Responsive behavior
- Enterprise usability
- Error handling
- Backend integration
- Performance

Do not change the fundamental user experience without a documented reason.

# Frontend Technology

The production frontend shall use:

- React
- TypeScript
- React Router
- React hooks
- Shared TypeScript contracts
- Centralized API services
- Reusable components
- Form validation
- Accessible UI components
- Responsive layouts
- Automated testing

The frontend shall be located at:

apps/web

# Frontend Architecture

Use a maintainable component-based architecture.

Recommended structure:

apps/web/

src/

app/

routes/

layouts/

pages/

components/

features/

hooks/

services/

api/

forms/

guards/

state/

utils/

main.tsx

Business logic must not be unnecessarily embedded inside presentation components.

Reusable functionality shall be extracted into appropriate components, hooks, services, utilities, or feature modules.

# Design System

Preserve the visual relationships established by the supplied design reference.

The design system shall centrally define:

- Primary colors
- Secondary colors
- Accent colors
- Typography
- Font sizes
- Font weights
- Spacing
- Border radius
- Shadows
- Form controls
- Buttons
- Cards
- Status indicators
- Icons
- Tables
- Modals
- Notifications
- Loading states
- Error states
- Empty states

Avoid duplicated styling definitions.

# Visual Identity

The interface shall retain the Camel Mobility Wallet visual identity.

The reference design uses:

- Deep green as the primary brand color
- Amber/gold as the primary accent
- Light neutral surfaces
- High-contrast primary text
- Muted secondary text
- Rounded cards
- Compact dashboard layouts
- Clear status indicators
- Minimal visual clutter
- Strong information hierarchy

Accessibility requirements take priority where a design choice creates insufficient contrast or usability.

# Responsive Design

The application shall support:

- Mobile phones
- Tablets
- Laptops
- Desktop displays

The interface must remain usable on small screens.

Responsive behavior shall appropriately adapt:

- Navigation
- Cards
- Forms
- Station grids
- Transaction lists
- Tables
- Charging information
- Wallet information
- Registration workflows

Do not merely shrink the desktop interface.

Create appropriate responsive layouts.

# Navigation

The reference customer navigation consists of:

- Dashboard
- Charge
- Top Up
- History
- Register

React Router shall replace prototype JavaScript tab switching.

Routes shall be implemented using maintainable route definitions.

Protected routes shall use authentication and authorization guards.

# Dashboard

The dashboard shall provide an accurate summary of the customer's account and charging activity.

Where supported by backend APIs, display:

- Wallet balance
- NFC card status
- Card identifier
- Charging session statistics
- Energy consumption
- Recent charging sessions
- Recent financial activity
- Account status

All production values must come from backend APIs.

Do not hardcode:

- Wallet balances
- Session counts
- Energy values
- Customer information
- Transaction amounts
- Station information

The dashboard shall support:

- Loading state
- Error state
- Empty state
- Successful state

# NFC Card Experience

The NFC card is a core part of the customer experience.

Preserve the visual concept of the NFC card shown in the design reference.

The production interface shall support, where applicable:

- Card status
- Card identifier
- Card ownership
- Card linking
- Card activation
- Card suspension
- Card replacement
- Card blocking
- Card availability

The interface must clearly distinguish:

- Card detected
- Card linked
- Card active
- Card suspended
- Card blocked
- Card unavailable
- Card replacement required

Never display successful NFC detection or card linking unless confirmed by the appropriate backend or approved NFC integration.

# Customer Registration

The registration experience shall preserve the supplied design while supporting the enterprise registration process.

The registration workflow may include:

- First name
- Last name
- Phone number
- Email
- Vehicle information
- Customer identification information where required
- NFC/RFID card information
- Consent information
- Other required business information

The exact fields shall follow the backend contracts and business rules.

# Hybrid Registration

The registration system shall support two authorized registration paths:

- Customer-initiated registration
- Admin-assisted registration

Both paths shall ultimately create the same authoritative customer record through the backend.

The system must distinguish:

- Customer as the account owner
- User who performed the registration

Admin-assisted registration must require appropriate RBAC permissions.

The frontend must not bypass backend authorization.

The UI shall clearly indicate when an Admin Officer is registering a customer on behalf of that customer.

# NFC/RFID Registration

The registration workflow shall provide an NFC/RFID card association experience.

The interface may include:

- Card scanning area
- Card identifier
- Card status
- Linking state
- Success state
- Failure state
- Retry action

The frontend must never invent NFC/RFID identifiers.

Actual identifiers must originate from an authorized NFC/RFID integration or backend service.

# Charging Experience

The charging interface shall preserve the intended charging workflow.

The customer shall be able to:

- View available charging stations
- View charger availability
- View connector availability
- View charger power
- Select a charging point
- View applicable charging information
- Request charging authorization
- Start an authorized charging session
- Monitor an active session
- View live charging information
- Stop charging where permitted

All charging state must come from backend charging services.

Do not simulate charging in production.

# OCPP Integration

The reference interface may display OCPP information to communicate the charging technology.

OCPP business logic shall remain in the backend.

The frontend shall not implement OCPP protocol processing.

The frontend shall consume approved backend APIs and real-time interfaces.

Technical OCPP information should only be exposed to users when appropriate to their role.

# Real-Time Charging

Active charging sessions shall support real-time updates where required.

Use secure WebSocket or another approved real-time mechanism.

Possible information includes:

- Session status
- Energy delivered
- Charging power
- Elapsed time
- Current cost
- Meter values
- Charger status
- Stop events
- Fault conditions

The frontend shall handle:

- Connection loss
- Reconnection
- Delayed updates
- Backend errors
- Session termination
- Charger faults

Never fabricate real-time charging information.

# Wallet

The wallet interface shall display authoritative information obtained from the backend.

Possible information includes:

- Current balance
- Available balance
- Reserved balance
- Minimum required balance
- Wallet status
- Recent transactions

The frontend must never become the authoritative source for wallet balances.

Financial calculations and wallet business rules belong to backend services.

# Minimum Wallet Balance

Where the business rules require a minimum wallet balance before charging, the UI shall communicate the requirement clearly.

The frontend may:

- Display the minimum balance requirement
- Warn the customer when the balance is insufficient
- Disable inappropriate actions for usability
- Display the backend authorization result

The backend remains the authoritative enforcement point.

Frontend validation must never be the only enforcement mechanism.

# Top Up

The top-up experience shall preserve the supplied design while integrating with production payment services.

Supported methods may include:

- Bank transfer
- Card
- USSD
- Other approved payment methods

The frontend shall communicate with payment services through the backend.

Never expose payment provider secret credentials in the frontend.

The interface shall support:

- Payment initiation
- Payment authorization
- Payment pending
- Payment success
- Payment failure
- Payment cancellation
- Payment retry

# Payment Integration

Approved payment providers may include:

- Paystack
- Opay
- Moniepoint
- Other approved providers

Provider credentials shall remain server-side.

The frontend shall never contain private payment credentials.

Payment status shall be determined by the backend.

# Transaction History

The transaction history shall preserve the reference design.

Transactions must be retrieved from backend APIs.

The interface may support:

- All transactions
- Charging transactions
- Top-ups
- Refunds
- Adjustments
- Failed payments
- Date filtering
- Status filtering
- Pagination
- Transaction details

Do not use hardcoded transaction records.

# API Integration

All production data shall come from documented backend APIs.

The frontend shall use centralized API services.

Do not scatter direct HTTP requests throughout React components.

The frontend shall consume shared TypeScript contracts from:

packages/shared-types

API requests and responses must remain synchronized with backend contracts.

# API Contract Management

Frontend integration shall follow the platform API contract-management strategy.

Contracts shall define:

- Request structures
- Response structures
- Error structures
- Authentication requirements
- Authorization requirements
- Validation requirements
- API version
- Deprecation information

Breaking changes must follow the platform API evolution policy.

Do not adapt silently to undocumented API changes.

# Event Contract Integration

Where frontend functionality depends on domain events, the frontend shall consume approved event-derived state or real-time interfaces.

Relevant events may include:

- CustomerRegistered
- NFCCardLinked
- WalletCredited
- WalletDebited
- ChargingSessionStarted
- MeterValueReceived
- ChargingSessionStopped
- PaymentCompleted
- PaymentFailed

The frontend must not depend directly on internal backend implementation details.

# Developer Portal and Sandbox

The UI architecture shall remain compatible with the platform Developer Portal and Sandbox.

The customer wallet shall not expose privileged developer functionality.

Separate authorized interfaces may provide:

- API documentation
- API key management
- OAuth application management
- Sandbox credentials
- Webhook configuration
- Event subscriptions
- API usage
- Integration testing
- API version information

Developer functionality shall follow enterprise RBAC and security requirements.

# Loading States

Every backend-connected workflow shall provide appropriate loading states.

Examples include:

- Dashboard loading
- Station loading
- Wallet loading
- Transaction loading
- Registration submission
- NFC card linking
- Payment initiation
- Charging authorization
- Charging start
- Charging stop

Prevent duplicate submissions where appropriate.

# Error Handling

The interface shall provide clear and actionable errors.

Errors shall distinguish between:

- Validation errors
- Authentication errors
- Authorization errors
- Network errors
- Backend errors
- Payment errors
- NFC errors
- Charging errors
- Temporary service failures

Do not expose sensitive infrastructure information.

# Empty States

Provide useful empty states for:

- No charging sessions
- No transactions
- No available chargers
- No linked NFC card
- No payment history
- No active charging session

Where appropriate, provide a clear next action.

# Notifications

Use consistent notifications for:

- Success
- Failure
- Warning
- Information

Important financial and charging results must also remain visible in the relevant interface.

# Forms

Forms shall use reusable components and centralized validation.

Forms must support:

- Required fields
- Format validation
- Backend validation errors
- Accessible labels
- Keyboard navigation
- Submission state
- Error messages
- Success state

Frontend validation improves usability but does not replace backend validation.

# Authentication

The frontend shall use the platform's centralized authentication system.

It shall support:

- Authenticated sessions
- Protected routes
- Session expiration
- Unauthorized access
- Secure logout

Authentication implementation must comply with the enterprise security architecture.

# Role-Based Access Control

The frontend shall respect backend RBAC.

Possible roles include:

- Customer
- Admin Officer
- Super Admin
- Operations User
- Support User
- Finance User
- Technical/OCPP User
- Developer/Integration User

Frontend controls may hide actions for usability.

Backend authorization remains the actual security boundary.

# Accessibility

The production frontend shall follow enterprise accessibility requirements.

Support:

- Keyboard navigation
- Semantic HTML
- Accessible labels
- Visible focus indicators
- Appropriate color contrast
- Screen-reader compatibility
- Accessible error messages
- Accessible dialogs
- Accessible notifications
- Touch-friendly controls

Accessibility improvements take priority over exact visual reproduction when required.

# Security

The frontend shall follow security-by-design principles.

Never:

- Store secrets in frontend code
- Expose private API credentials
- Trust client-side authorization
- Trust frontend validation as security
- Store unnecessary sensitive information
- Log sensitive payment information
- Expose internal infrastructure details
- Bypass backend security controls

All security-sensitive decisions must be enforced by the backend.

# Data Integrity

The backend is the source of truth.

The frontend must not independently become authoritative for:

- Wallet balance
- Charging cost
- Charging status
- Payment status
- NFC card status
- Customer authorization
- Account status
- Transaction records

Optimistic UI may only be used where it cannot cause financial, security, or charging inconsistencies.

# Performance

The frontend shall be production optimized.

Use appropriate:

- Code splitting
- Lazy loading
- Efficient API requests
- Caching
- Render optimization
- Image optimization
- Bundle optimization
- Efficient WebSocket handling
- Pagination
- Debounced searches
- Appropriate loading strategies

Avoid unnecessary complexity.

# Component Reusability

Common UI elements shall be reusable.

Examples include:

- Buttons
- Inputs
- Selects
- Modals
- Cards
- Badges
- Status indicators
- Toasts
- Tables
- Pagination
- Loading indicators
- Empty states
- Error states
- NFC card
- Wallet card
- Station card
- Transaction row
- Charging session status

Do not create duplicate components for the same purpose.

# State Management

Use React state and hooks for local UI state where appropriate.

Separate server state from local UI state.

Use centralized state management only where application complexity requires it.

Do not place authoritative business rules inside frontend state.

# Design Fidelity

The final implementation shall closely preserve the supplied visual reference.

Preserve:

- Brand identity
- Green and amber color language
- Card styling
- Dashboard structure
- Navigation hierarchy
- Station cards
- Wallet presentation
- Transaction presentation
- NFC experience
- Registration workflow
- Responsive behavior

Changes must be justified by production requirements where they alter the reference significantly.

# Raw Reference File

The supplied HTML/CSS/JavaScript shall be stored as:

docs/ui-ux-reference-source.html

The Markdown UI/UX specification shall be stored as:

docs/ui-ux-reference.md

The raw HTML file is not production code.

The Markdown file defines how the design must be translated into production frontend architecture.

# Prohibited Implementation

Replit Agent shall not:

- Copy prototype JavaScript into React
- Retain inline onclick handlers
- Use hardcoded wallet balances
- Use hardcoded transactions
- Simulate charging
- Simulate NFC detection
- Simulate payment success
- Place business logic inside presentation components
- Bypass backend APIs
- Create duplicate API implementations
- Store secrets in frontend code
- Treat frontend validation as security enforcement

# Frontend Testing

The frontend shall include automated tests covering appropriate:

- Component rendering
- Navigation
- Form validation
- Authentication
- RBAC
- API integration
- Loading states
- Error states
- Empty states
- Registration
- NFC workflows
- Wallet workflows
- Charging workflows
- Top-up workflows
- Transaction filtering

Critical customer workflows shall include end-to-end tests.

# Frontend and Backend Synchronization

A frontend feature is incomplete until:

- Backend functionality exists
- API contract exists
- Shared types are updated
- Frontend API service exists
- UI is connected to the live API
- Validation is synchronized
- Authentication is enforced
- RBAC is enforced
- Loading states are handled
- Error states are handled
- Tests pass
- Documentation is updated

Frontend and backend shall be developed as a synchronized vertical slice.

# Module Development

The UI/UX reference shall be applied progressively.

Do not build the entire frontend as a prototype before backend modules exist.

For each module:

- Identify the required UI.
- Identify the required backend APIs.
- Identify shared contracts.
- Implement backend functionality.
- Implement corresponding frontend functionality.
- Connect the frontend to live APIs.
- Test the complete vertical slice.
- Update documentation.

Do not proceed to the next module until the current module satisfies its acceptance criteria.

# Acceptance Criteria

The UI/UX implementation is complete only when:

- React is used.
- TypeScript is used.
- React Router is used.
- Reusable components are implemented.
- React hooks are used appropriately.
- Shared TypeScript contracts are used.
- Centralized API services are used.
- Live backend APIs replace mock data.
- Prototype business logic has been removed.
- Hardcoded business data has been removed.
- NFC functionality is backend-integrated.
- Wallet functionality is backend-integrated.
- Charging functionality is backend/OCPP-integrated.
- Payment functionality is backend-integrated.
- Registration supports the approved hybrid registration model.
- RBAC is respected.
- Loading states are implemented.
- Error states are implemented.
- Empty states are implemented.
- Responsive design is implemented.
- Accessibility requirements are addressed.
- Automated tests pass.
- Critical end-to-end workflows pass.
- The frontend compiles successfully.
- The frontend follows the enterprise monorepo architecture.
- The frontend conforms to architecture.md.
- The frontend conforms to business-rules.md.
- The frontend conforms to development-standards.md.

# Replit Agent Instructions

Before implementing any frontend functionality, inspect:

/docs/architecture.md

/docs/business-rules.md

/docs/development-standards.md

Then inspect:

/docs/ui-ux-reference.md

Then inspect:

/docs/ui-ux-reference-source.html

Treat the four Markdown documents as authoritative project specifications.

Treat the HTML source as a visual and interaction reference only.

Analyze the existing repository before making changes.

Do not overwrite completed functionality.

Do not create duplicate architecture.

Do not generate mock production functionality.

Do not use hardcoded business data.

Implement only the frontend functionality required for the current module.

Connect it to the corresponding backend functionality.

Use shared contracts.

Use centralized API services.

Use live backend data.

Follow the enterprise architecture.

Follow the business rules.

Follow the development standards.

Run the required tests after implementation.

Fix compilation, linting, type, integration, and test failures before declaring the module complete.

Do not proceed to the next module until the current module satisfies its acceptance criteria.

# Source-of-Truth Hierarchy

When resolving conflicts, follow this order:

# Business and Security Rules

Backend business and security requirements take priority.

# Architecture

architecture.md defines the enterprise architecture.

# Business Rules

business-rules.md defines authoritative business behavior.

# Development Standards

development-standards.md defines engineering and delivery standards.

# UI/UX Reference

ui-ux-reference.md defines frontend visual and interaction requirements.

# Raw UI/UX Reference

ui-ux-reference-source.html provides the visual prototype reference.

The visual reference must never override:

- Security requirements
- Business rules
- Backend authorization
- API contracts
- Enterprise architecture

# Final Principle

The objective is not to reproduce the prototype code.

The objective is to reproduce the intended Camel Mobility Wallet experience as an enterprise-grade React application.

The final frontend must combine:

- Visual fidelity
- Usability
- Accessibility
- Responsive design
- Secure architecture
- Live backend integration
- Shared contracts
- Real-time capabilities
- Enterprise testing
- Maintainability
- Production deployment readiness

The final result must be a production-ready frontend rather than a static UI prototype.
