# Calendar Intelligence V1

Status: Locked

Date: 2026-06-01

## Scope

Calendar ingestion, attribution, prep windows, conflict detection,
community scheduling, sports scheduling, travel awareness,
pagination handling, and relevance scoring.

## Major Fixes

- Fixed board/community misclassification
- Fixed Google all-day event end-date handling
- Fixed TeamSnap sport detection fallback
- Fixed appointment health false positives
- Fixed BFSC community event suppression
- Extended sports prep windows
- Added calendar pagination
- Enabled work travel prep windows
- Added pagination truncation diagnostics

## Deferred Risks

### Risk A
Generic football/volleyball/cheer events without child attribution.

### Risk B
Resolved with truncation diagnostics.

### Risk C
Conference keyword may trigger travel prep profile in rare cases.

## Result

Calendar Intelligence V1 passed adversarial audit and re-audit.