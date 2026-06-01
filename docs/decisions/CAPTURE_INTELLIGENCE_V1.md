# Capture Intelligence v1

Status: Locked  
Date: 2026-06-01  
Scope: apps/mobile

## Purpose

Capture Intelligence allows Ryan to type natural language and have Meridian decide where it belongs without requiring manual classification.

The system must answer:

"Where did my capture go?"

No important capture should silently disappear.

## Core Rule

Any capture with:

- meaningful life signal
- clear day/date
- and either a specific time or clear day-level commitment

must either:

1. Promote appropriately into Plan, Life, and Focus, or
2. Provide a clear rejection reason.

No silent failures.

## What Promotes

Captures should promote when they include:

- family logistics
- youth sports
- registrations
- work meetings
- work deadlines
- community commitments
- BFSC items
- health appointments
- health self-management
- money/payment obligations
- strong action + clear day/date

Examples:

- Pick up Quinn from football tomorrow at 8pm
- Grace volleyball tournament Saturday 9am
- Reagan cheer practice Tuesday at 6
- Macy’s summit next Thursday at 2pm
- Submit expense report before Friday
- Hudson football registration opens Monday
- BFSC board meeting Tuesday at 7pm
- Review payment due tomorrow
- Take medication refill Friday

## What Does Not Promote

Captures should not promote when they lack timing or a meaningful scheduling anchor.

Examples:

- Remember to call the HVAC company
- Buy milk
- Schedule dentist appointment
- Order pool chemicals for BFSC

These remain in Capture, Life, and/or Focus as appropriate but do not enter Plan.

## Family Rules

Known household child names are meaningful signals:

- Grace
- Reagan
- Quinn
- Hudson

Child activity terms should support Family classification and Plan promotion:

- football
- hockey
- volleyball
- basketball
- lacrosse
- baseball
- cheer
- tournament
- practice
- game
- registration
- league
- season
- tryout
- tryouts

First-word child names are valid when followed by a meaningful activity.

Example:

Grace volleyball tournament Saturday 9am

should infer:

- person: Grace
- domain: Family
- Plan promotion: yes

## Work Rules

Work captures should promote when they describe a meeting, summit, review, deadline, store visit, leadership event, or business action with a day/date.

Examples:

- Macy’s summit next Thursday at 2pm
- Submit expense report before Friday
- Store visit at Cherry Hill Wednesday at 11
- Bloomingdale’s rug review Friday at 2pm

Bare board language should not automatically mean Community.

Work board language should remain Work unless BFSC/swim club/community signals are present.

## Community / BFSC Rules

BFSC, swim club, pool, membership, board meeting with BFSC/swim club context, volunteer, and insurance items should classify as Community.

Examples:

- BFSC board meeting Tuesday at 7pm
- Email Monica about swim club insurance tomorrow morning

Community items without timing should not promote.

Example:

Order pool chemicals for BFSC

should remain non-promoted unless timing is added.

## Health Rules

Health classification should require medical or wellness context.

Bare "appointment" does not automatically mean Health.

Health examples:

- Dentist appointment next Tuesday at 9am
- Doctor appointment Monday
- Take medication refill Friday
- Started physical therapy Monday

Non-health examples:

- Sales appointment Monday at 2pm
- Client appointment Wednesday
- Started planning Q3 budget

## Timing Rules

Supported timing includes:

- tomorrow at 8pm
- Saturday 9am
- next Thursday at 2pm
- before Friday
- by Monday
- Friday afternoon
- Tuesday morning
- Thursday evening
- Friday night

Day + time without "at" must still parse.

Example:

Saturday 9am

means:

Saturday at 9:00 AM

## Diagnostics

Promotion diagnostics should include:

- exactDayDetected
- exactClockDetected
- dayOnlyDetected
- meaningfulDomainSignal
- actionableIntentDetected
- promotedBecause
- rejectionReason

Expected promotedBecause values may include:

- exact_day_exact_clock
- child_activity_signal
- action_with_day
- community_signal
- deadline_day
- sports_registration
- health_self_management

Expected rejection reasons may include:

- no_timing
- vague_timing
- no_domain_signal
- no_action_or_event_signal
- ambiguous_capture
- recurring_not_specific_instance

## Locked Test Set

The following should promote:

- Pick up Quinn from football tomorrow at 8pm
- Grace volleyball tournament Saturday 9am
- Reagan cheer practice Tuesday at 6
- Macy’s summit next Thursday at 2pm
- Submit expense report before Friday
- Hudson football registration opens Monday
- BFSC board meeting Tuesday at 7pm
- Review payment due tomorrow
- Take medication refill Friday

The following should not promote:

- Remember to call the HVAC company
- Buy milk
- Schedule dentist appointment
- Order pool chemicals for BFSC

## Known Deferred Limitations

These are real but not blockers for v1:

- Absolute date parsing such as June 15, 7/31, or the 28th
- In X days / in X weeks resolution
- School closure relevance tuning
- Work travel prep windows
- Capture deduplication
- Conflict detection optimization
- Multi-user household configuration

## Lock Criteria

Capture Intelligence v1 is considered locked because:

- Ryan Daily Driver test set passed
- Primary false negatives were resolved
- Primary false positives were resolved
- Typecheck passed
- Capture tests passed
- Promotion diagnostics explain outcomes