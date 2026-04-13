# AI Astrology Pivot

## Purpose

This is the single source of truth for the Clario astrology rewrite.

It replaces the separate master plan, rewrite status, and implementation backlog docs.

Use this file for:

- current rewrite status
- locked product decisions
- delivery phases and backlog
- architecture and domain design
- launch criteria and next build slice

## Current State

### Rewrite mode

The repository is in full rewrite mode.

- the legacy learning product is no longer the reference product
- backward compatibility with the old domain is not a goal
- new schema, services, routes, and copy should serve the astrology product first

### Completed foundation work

- pivot branch established and active
- astrology-first product scope defined
- new astrology domain constants and types added
- chart input validation added
- structured reading output schema added
- initial astrology baseline migration added
- billing tables removed from the active cloud schema
- Supabase types regenerated for the rewritten schema
- charts API, chart detail API, and readings API added
- onboarding, charts, readings, dashboard, and settings shifted to astrology-first surfaces
- active runtime narrowed to Qwen, Ollama, and mock
- account merge flow rewritten around charts, readings, and preferences
- legacy learning UI, sources/themes/cards APIs, and old billing UI removed from active paths
- admin usage surfaces now read from `usage_counters`
- workspace TypeScript check was returned to a clean state during the pivot cleanup

### Latest direction lock

- Qwen is the default hosted provider
- Ollama remains supported for local or self-hosted runtime
- public billing is not a core dependency of the current product stage
- if gating is needed before launch, prefer internal usage caps or admin-managed access over checkout-driven plans

### Working rule

When legacy code conflicts with the astrology direction, the legacy code loses.

## Immediate Next Slice

The next implementation slice should focus on:

1. replacing the deterministic mock engine with a real astrology calculation adapter
2. adding follow-up thread and message APIs
3. extending reading generation with retries and scoped variants
4. removing remaining legacy routes, hooks, and stale product copy
5. reducing remaining `as any` bridges in data access

## Delivery Strategy

We are doing a full replacement rewrite inside the pivot branch.

Principles:

- keep only reusable infrastructure
- replace the business domain completely
- do not preserve legacy route compatibility
- do not add new legacy-product features
- treat old product code as removable by default

## Strategic Decision

Clario is being rebuilt into a web-first AI astrology analysis platform.

The current codebase should be treated as reusable technical foundation, not as reusable product shape.

### Keep

- Next.js App Router
- React and TypeScript
- Supabase
- NextAuth
- next-intl
- Vercel deployment model
- general auth/admin patterns where still useful

### Replace or rewrite

- business entities tied to themes, sources, cards, sessions, and study
- user flows tied to the learning domain
- most database tables and RLS policies
- most landing, dashboard, settings, and API copy and UX
- old broad multi-provider LLM architecture
- billing and subscription architecture as a product driver

## Hard Product Constraints

- Qwen is the default hosted LLM provider
- Ollama is the supported local or self-hosted fallback
- OpenAI, Anthropic, Groq, and Gemini paths are legacy and should stay removed unless a concrete product reason appears
- the previous public checkout stack is not part of the must-have launch path
- the app must become a coherent astrology product before monetization is rebuilt

## Product Vision

### Core product

A user provides birth data and optional context. The system computes deterministic chart data and generates structured AI-powered astrological interpretations, saved readings, and follow-up guidance.

### Product principles

- web-first experience with clean mobile support
- high-trust presentation instead of gimmicky mysticism UI
- structured outputs first, freeform prose second
- birth data privacy is a core concern
- every AI result should be reproducible from stored input, prompt version, and model metadata
- calculated astrology facts and narrative interpretation should stay distinct

### Positioning

The app should feel like a premium personal insight workspace, not a casual horoscope generator.

### Primary market assumption

- CIS market first
- Russian-first copy, onboarding, and tone
- English remains supported, but secondary

## Product Behavior Model

### Core loop

1. user enters birth data
2. system validates and enriches location and timezone
3. system computes deterministic chart data
4. system generates a structured Russian-language reading
5. user reviews placements, sections, and advice
6. user asks follow-up questions scoped to the chart or reading
7. system stores context and usage counters for return sessions

### UX behavior principles

- Russian is the default language
- the first report should be understandable to a non-astrologer
- tone should be respectful, warm, psychologically literate, and non-ironic
- uncertainty must be explicit when chart precision is weak
- unknown birth time must visibly reduce certainty for time-sensitive interpretations
- important AI actions should either complete deterministically or fail into a recoverable saved state

### Trust model

- never pretend certainty where chart precision is weak
- clearly separate calculated chart facts from interpretation
- avoid manipulative fear language and fatalism
- keep medical, legal, and financial advice out of scope

## Localization Strategy

### Launch language policy

- Russian is the default locale
- Russian copy is the reference version for product surfaces
- English is maintained where practical, but not as the primary product voice

### Content style for CIS market

- use natural Russian, not machine-translated phrasing
- prefer terms familiar to Russian-speaking astrology audiences
- keep premium positioning modern and trustworthy rather than theatrical

## Primary User Types

### Curious individual

- natal chart explanation
- personality breakdown
- love, career, and money insights
- simple onboarding

### Returning self-development user

- saved charts
- recurring forecasts
- follow-up questions
- long-lived reading history

### Relationship-oriented user

- compatibility comparison
- synastry overview
- conflict and strength analysis

### Advanced enthusiast or pro astrologer

- multiple client charts
- reusable report generation
- more detailed placements, aspects, and houses view
- export or share tools later

## Phase 1 Product Scope

### Core features

- account creation and login
- onboarding wizard for birth data
- natal chart profile generation
- AI report generation from chart data
- saved readings library
- reading detail page
- limited follow-up chat per reading
- admin panel for users, generations, and report health

### Monetization policy

Phase 1 should not depend on active subscriptions or payment checkout.

Allowed temporary options:

- single free product mode
- simple internal usage caps without checkout
- admin-controlled access for staged rollout

Not allowed as a launch blocker:

- public pricing as a required conversion surface
- legacy checkout-provider dependency in the main user loop
- deep subscription-state coupling in chart and reading workflows

### Explicitly out of Phase 1

- live astrologer marketplace
- voice readings
- community or social feed
- Telegram-first product surface
- complex recurring content bundles
- white-label B2B mode

## Product Modules

### Identity and onboarding

- email and password auth
- collect consent for sensitive birth data
- collect birth date, time, city, and country
- optional Telegram linking later, not required for launch

### Astrology profile engine

- deterministic natal chart calculation pipeline
- positions, houses, signs, and aspects
- normalized chart snapshot stored as JSON and relational rows
- LLM used for interpretation, not raw calculation

### Readings and reports

V1 reading types:

- natal overview
- personality deep dive
- love and relationships
- career and money
- strengths and challenges
- current transits snapshot

Report format:

- summary block
- structured sections
- methodology or confidence note
- optional placement highlights
- actionable advice

### Conversational follow-up

- chat scoped to a reading
- message quota if internal limits remain needed
- chart plus reading plus thread context window
- safe answer framing for sensitive topics

### Relationship and compatibility

Targeted for Phase 2:

- second chart input
- synastry summary
- compatibility explanation
- strengths and friction analysis

### Forecasting

Targeted for Phase 2:

- daily, weekly, or monthly transit reports
- notable windows and themes
- reminder loops later

### Account and access control

- minimal access-control primitives to prevent abuse
- no dependency on public billing in the current product stage
- if monetization returns, redesign it from astrology product needs rather than legacy assumptions

## Information Architecture

### Public routes

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/privacy`
- `/terms`
- `/pricing`

### Authenticated routes

- `/dashboard`
- `/onboarding`
- `/charts`
- `/charts/new`
- `/charts/[chartId]`
- `/readings`
- `/readings/[readingId]`
- `/chat/[readingId]`
- `/compatibility`
- `/compatibility/new`
- `/settings`
- `/settings/plan`

### Admin routes

- `/admin`
- `/admin/users`
- `/admin/readings`
- `/admin/prompts`
- `/admin/jobs`
- `/admin/billing`

## End-to-End User Flows

### First-time user

1. user lands on marketing page
2. registers by email
3. confirms email
4. enters onboarding wizard
5. provides name, birth date, birth time, birth city, birth country, and optional unknown-time flag
6. app resolves timezone and coordinates
7. system computes natal chart
8. system generates initial natal overview
9. user lands on reading detail page

### Returning user

1. user opens dashboard
2. sees saved charts and readings
3. opens one report
4. asks a follow-up question

### Compatibility flow

1. user adds second person
2. system computes second chart
3. system computes comparison dataset
4. AI generates compatibility report
5. user saves and revisits the result

### Forecast flow

1. user chooses an existing chart
2. selects forecast range
3. system computes active transit data
4. AI generates forecast
5. user views timeline and suggested follow-ups

## Detailed Feature Set

### V1 must-have

- user auth
- onboarding wizard
- birth data validation
- deterministic chart calculation
- natal chart persistence
- AI natal overview report
- reading detail page
- saved reading library
- limited follow-up chat
- admin inspection tools
- EN and RU localization support

### V1 should-have

- unknown birth time handling
- shareable report link with privacy controls
- report regeneration with prompt versioning
- visible generation metadata
- simple export later if cheap to add

### V2

- compatibility reports
- transit forecasts
- recurring insights
- multiple charts per user
- family or partner profiles
- bookmarks or highlights in reports
- push or email reminders

### V3

- astrologer workspace
- client management
- custom report templates
- voice summary
- API or embeddable widgets

## Deterministic Astrology Layer

### Requirement

The system must calculate astrology data outside the LLM.

### Why

- reproducibility
- factual consistency
- lower hallucination rate
- easier debugging
- ability to regenerate reports without recomputing everything

### Recommended architecture

Input:

- birth date
- birth time or unknown time flag
- timezone
- latitude
- longitude
- house system

Computed output:

- planet signs and degrees
- ascendant when birth time is known
- MC when birth time is known
- house placements
- aspect graph
- retrograde flags
- chart warnings when time is approximate or missing

Storage:

- normalized relational rows for querying
- chart snapshot JSON for prompt building

### Unknown birth time policy

- allow chart creation without time
- clearly mark unavailable or approximate time-sensitive points
- restrict report types that rely heavily on houses or angles

## AI Layer Design

### AI should do

- explain chart components in human language
- synthesize multiple placements into a narrative
- personalize tone by user preference
- answer follow-up questions against chart context

### AI should not do alone

- calculate placements
- infer raw chart facts from birth date without a deterministic engine
- make medical, legal, or financial certainty claims

### Prompt architecture

Each generation should include:

- system prompt
- product safety prompt
- report-type prompt
- structured chart context
- user profile and tone preferences
- locale

### Output contract

Every report should be returned as structured JSON first and then rendered.

Core schema fields:

- `title`
- `summary`
- `sections[]`
- `placementHighlights[]`
- `advice[]`
- `disclaimers[]`
- `metadata`

### Versioning

Store with every generated output:

- provider
- model
- prompt version
- schema version
- chart snapshot version
- generation duration
- token usage when available

## Safety and Trust Layer

### Risk categories

- mental health dependence
- medical claims
- legal or financial advice framing
- manipulative relationship guidance
- over-certainty about life outcomes

### Product rules

- present astrology as interpretive guidance
- never frame output as guaranteed truth
- avoid deterministic predictions of death, illness, disaster, or criminal behavior
- block harmful advice requests
- provide neutral wording for sensitive relationship topics

### UX trust features

- methodology note on every report
- visible grounding in placements and aspects
- explicit visibility into missing birth-time limitations

## Database Model

### Legacy concepts to retire

- themes
- data_sources
- cards
- sessions
- session_cards
- bookmarked_cards
- card-based `user_usage`
- card_ratings

### Core active schema

#### profiles

- id
- display_name
- birth_data_consent_at
- locale
- timezone
- onboarding_completed_at
- marketing_opt_in
- is_admin
- created_at
- updated_at

#### user_preferences

- user_id
- tone_style
- content_focus_love
- content_focus_career
- content_focus_growth
- allow_spiritual_tone
- created_at
- updated_at

#### charts

- id
- user_id
- label
- subject_type
- person_name
- birth_date
- birth_time
- birth_time_known
- timezone
- city
- country
- latitude
- longitude
- house_system
- source
- status
- notes
- created_at
- updated_at

#### chart_snapshots

- id
- chart_id
- snapshot_version
- calculation_provider
- raw_input_json
- computed_chart_json
- warnings_json
- created_at

#### chart_positions

- id
- chart_snapshot_id
- body_key
- sign_key
- house_number
- degree_decimal
- retrograde

#### chart_aspects

- id
- chart_snapshot_id
- body_a
- body_b
- aspect_key
- orb_decimal
- applying

#### readings

- id
- user_id
- chart_id
- chart_snapshot_id
- reading_type
- title
- status
- locale
- prompt_version
- schema_version
- model_provider
- model_name
- summary
- rendered_content_json
- plain_text_content
- error_message
- created_at
- updated_at

#### reading_sections

- id
- reading_id
- section_key
- title
- content
- sort_order

#### follow_up_threads

- id
- user_id
- chart_id
- reading_id
- title
- created_at
- updated_at

#### follow_up_messages

- id
- thread_id
- role
- content
- usage_tokens
- model_provider
- model_name
- created_at

#### compatibility_reports

- id
- user_id
- primary_chart_id
- secondary_chart_id
- status
- summary
- rendered_content_json
- prompt_version
- model_provider
- model_name
- created_at

#### forecasts

- id
- user_id
- chart_id
- forecast_type
- target_start_date
- target_end_date
- transit_snapshot_json
- rendered_content_json
- created_at

#### usage_counters

- id
- user_id
- period_start
- period_end
- readings_generated
- follow_up_messages_used
- compatibility_reports_used
- forecasts_generated
- created_at
- updated_at

#### prompt_templates

- id
- key
- version
- locale
- system_prompt
- developer_prompt
- output_schema_json
- active
- created_at

#### generation_logs

- id
- user_id
- entity_type
- entity_id
- operation_key
- provider
- model
- request_payload_json
- response_payload_json
- latency_ms
- error_message
- created_at

### RLS direction

- users can access only their own charts, readings, threads, forecasts, and usage
- admin can inspect all
- public sharing should use signed tokens rather than open public rows

## Access Packaging Direction

Public billing is not part of the current must-have product loop, but the packaging model should still be documented for future decisions.

### Proposed future plans

#### Free

- 1 chart
- 1 natal overview
- limited follow-up questions
- no compatibility
- no forecasts

#### Plus

- up to 5 charts
- extended natal reports
- more follow-up questions
- saved reading history

#### Pro

- more charts
- compatibility reports
- monthly forecasts
- priority generation

### Metering model

Do not meter by cards.

Use:

- charts per account
- reports per period
- follow-up messages per period
- compatibility reports per period
- forecasts per period

## Frontend UX Direction

### Desired feel

- premium
- calm
- elegant
- mystical but restrained
- not kitschy
- mobile-first but strong on desktop

### UI building blocks

- onboarding wizard
- chart summary cards
- report sections with anchors
- highlighted placements panel
- follow-up AI chat panel
- trust and methodology banners

### Design rules

- avoid cheap zodiac clichés
- use symbolic motifs sparingly
- typography should feel editorial
- structured content should dominate over decoration

## API Surface Proposal

### Auth and profile

- `GET|PATCH /api/profile`
- `GET|PATCH /api/profile/preferences`
- `POST /api/auth/*`

### Charts

- `GET /api/charts`
- `POST /api/charts`
- `GET /api/charts/[chartId]`
- `PATCH /api/charts/[chartId]`
- `DELETE /api/charts/[chartId]`
- `POST /api/charts/[chartId]/recalculate`

### Readings

- `GET /api/readings`
- `POST /api/readings`
- `GET /api/readings/[readingId]`
- `POST /api/readings/[readingId]/regenerate`

### Follow-up chat

- `GET /api/chat/threads/[threadId]`
- `POST /api/chat/threads`
- `POST /api/chat/threads/[threadId]/messages`

### Compatibility

- `POST /api/compatibility`
- `GET /api/compatibility/[id]`

### Forecasts

- `POST /api/forecasts`
- `GET /api/forecasts/[id]`

### Admin

- users
- charts
- readings
- generations
- billing or access oversight if it returns later
- prompt versions

## Migration Strategy

This is a hard rewrite, not a soft extension.

### Recommendation

Do not preserve legacy business objects, route structure, or schema assumptions.

### Rewrite approach

1. replace the legacy domain schema with the astrology schema
2. preserve only cross-cutting infrastructure that still matters
3. delete legacy product tables and outdated usage accounting
4. replace the existing API surface with astrology APIs
5. replace the main route tree and navigation with astrology-first routes

### Branch working rule

We do not optimize for the old app continuing to function during the rewrite.

## Execution Backlog

### Phase 0. Product lock

Goals:

- freeze old roadmap execution
- finalize V1 astrology scope
- approve data and privacy assumptions
- choose deterministic astrology calculation approach

Tasks:

- [ ] confirm V1 includes natal report, saved readings, and follow-up chat
- [ ] confirm whether Telegram survives in V1 or is parked
- [ ] choose chart calculation provider or library
- [ ] define default house system
- [ ] define unknown birth time behavior
- [ ] define tone rules for report generation
- [ ] define privacy policy changes for birth data storage

### Phase 1. Data foundation

Goals:

- establish the new schema
- stop designing around themes, cards, and sessions
- create the new usage metering model

Tasks:

- [x] add astrology foundation migration
- [x] convert migration approach to hard rewrite of legacy domain
- [x] regenerate Supabase types after schema settles
- [x] rewrite plan limits toward charts and reports
- [ ] rewrite profile shape for onboarding and consent
- [ ] add indexes for chart and reading lookup patterns

### Phase 2. Core backend

Goals:

- create deterministic chart pipeline
- persist chart snapshots
- generate structured readings

Tasks:

- [ ] implement location and timezone resolution service
- [ ] implement deterministic chart calculation adapter
- [ ] implement chart creation API fully
- [ ] implement chart recalculation API
- [ ] implement reading generation service fully
- [ ] implement structured report renderer pipeline
- [ ] implement quota enforcement against `usage_counters`
- [ ] implement generation logging

### Phase 3. Core frontend

Goals:

- replace dashboard and onboarding
- establish astrology UX shell

Tasks:

- [ ] rewrite landing page for astrology product
- [ ] create onboarding wizard
- [ ] create charts list page
- [ ] create chart detail page
- [ ] create readings list page
- [ ] create reading detail page
- [ ] rewrite settings for new product terminology
- [ ] remove remaining legacy navigation and screens from the primary UX

### Phase 4. Conversational layer

Goals:

- support scoped follow-up questions per reading

Tasks:

- [ ] add follow-up thread APIs
- [ ] add follow-up message APIs
- [ ] implement reading-scoped AI chat context builder
- [ ] enforce per-plan or per-access follow-up quota
- [ ] implement safety framing for sensitive topics

### Phase 5. Future packaging

Goals:

- define future access packaging only after the core astrology loop is stable

Tasks:

- [ ] decide whether public monetization is needed after V1
- [ ] design packaging around charts, readings, and follow-up depth
- [ ] add admin-managed internal access policies if rollout control is needed
- [ ] add compatibility report quota
- [ ] add forecast quota

### Phase 6. Cleanup and cutover

Goals:

- fully retire remaining legacy modules

Tasks:

- [ ] delete obsolete legacy routes and endpoints
- [ ] delete obsolete hooks and services
- [ ] delete obsolete components
- [x] delete or archive old migration assumptions in docs
- [x] replace README with astrology product documentation
- [ ] update SEO, metadata, and legal copy
- [ ] remove legacy navigation and landing structure entirely

## Technical Rebuild Plan

### Phase sequence

1. planning and architecture
2. data model and infrastructure
3. core domain backend
4. core frontend
5. conversational layer
6. hard cleanup

### Implementation order

1. freeze remaining legacy-product work
2. confirm deterministic astrology engine choice
3. finish schema and data access alignment
4. complete core chart and reading flows
5. add follow-up chat and richer variants
6. remove remaining legacy UI and code paths

## File and Folder Rewrite Plan

### Likely to be deleted or fully replaced

- most of `src/app/dashboard`
- most of `src/app/study`
- most of `src/app/themes`
- `src/app/bookmarks`
- legacy hooks, services, and components that do not fit the astrology product
- ingestion modules for learning sources unless they are repurposed

### Likely to be retained and adapted

- auth routes
- settings shell
- admin shell
- generic admin and access-control utilities
- env validation
- logger
- generic API wrapper patterns

### Target folders

- `src/lib/astrology/`
- `src/lib/geocoding/`
- `src/lib/readings/`
- `src/lib/prompts/`
- `src/lib/safety/`
- `src/components/astrology/`
- `src/components/readings/`
- `src/components/onboarding/`
- `src/services/charts-api.ts`
- `src/services/readings-api.ts`
- `src/services/chat-api.ts`

## Testing Strategy

### Minimum required coverage

- unit tests for chart input validation
- unit tests for deterministic chart calculation adapters
- unit tests for prompt builders and output parsing
- integration tests for chart creation and reading generation APIs
- integration tests for quota enforcement
- component tests for onboarding and reading rendering

### Critical acceptance tests

- user can create a chart with known birth time
- user can create a chart with unknown birth time
- user can generate a natal report
- user can ask a follow-up question
- internal free or staged access limits are enforced correctly

## Operational Requirements

### Observability

- structured generation logs
- admin visibility into failed reports
- model or provider latency tracking
- prompt version audit trail

### Compliance and privacy

- explicit consent for birth data
- account deletion must remove charts and readings
- legal copy must reflect birth data storage and AI interpretation
- avoid storing unnecessary raw geo lookup data

### Performance

- chart calculation should be fast and deterministic
- report generation can be async with visible progress
- heavy generations should be resumable or retryable

## Open Product Decisions

1. should astrology calculations come from a local library or paid external API
2. do we support unknown birth time fully in V1 or defer parts to V1.1
3. does compatibility belong in the first paid or packaged release or later
4. does Telegram remain a companion surface in first launch
5. do we want PDF export in V1
6. which tone should be primary: mystical, therapeutic, or analytical
7. do we store exact birth data encrypted or as standard row data in Supabase

## Definition of Done for the Pivot MVP

The MVP pivot is complete when:

- a new user can register
- provide birth data
- get a deterministic chart computed
- receive a polished AI natal report
- save and revisit that report
- ask follow-up questions within the active limit model
- admins can inspect users, reports, and failures

## Practical Recommendation

Treat the repository as reusable platform infrastructure plus deployment plumbing.

The legacy application layer is disposable. The branch should converge toward a clean astrology product, not a hybrid.