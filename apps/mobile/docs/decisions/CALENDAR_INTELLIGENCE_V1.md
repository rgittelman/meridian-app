# Calendar Intelligence V1

## Status

LOCKED

---

## Audit Coverage

Calendar Intelligence V1 underwent:

- Initial adversarial audit
- Correction pass
- Full re-audit
- Pagination diagnostics pass
- Final validation review

---

## Implemented Fixes

### D1 — Board Domain Misclassification

Removed bare board matching from calendar domain attribution.

Result:
- Work board meetings remain work events.
- BFSC and community board meetings continue to classify correctly through community signals.

Files:
- inferDomain.ts
- inferOwner.ts
- inferCalendarContext.ts

---

### D2 — Google Calendar All-Day Event End Date

Corrected all-day event normalization to honor Google's exclusive end-date model.

Before:
- One-day events expanded to nearly two days.
- Multi-day vacations extended beyond their actual duration.

After:
- Event duration matches Google Calendar exactly.

Files:
- normalizeEvent.ts

---

### D3 — TeamSnap Sport Detection

Removed default hockey fallback.

Added support for:
- Football
- Volleyball
- Cheer
- Basketball
- Baseball

Result:
- Generic TeamSnap events display correctly.
- Unknown sports display as "Game" rather than "Hockey Game."

Files:
- isSportsSource.ts
- eventInferenceContext.ts
- childSportsDisplay.ts
- humanizeEventDisplay.ts
- evaluateRelevance.ts
- inferCalendarContext.ts

---

### D4 — Appointment Health False Positives

Removed bare appointment matching from calendar health classification.

Added medical co-signal requirements.

Examples:

Correct:
- Dentist appointment
- Doctor appointment
- Pediatrician visit

Not health:
- Sales appointment
- Vendor appointment
- Client appointment

Files:
- inferFromEvent.ts

---

### D5 — Community Calendar Visibility

Prevented BFSC and community events from being hidden when sourced from reader calendars.

Result:
- Community obligations remain visible even when calendar access is read-only.

Files:
- eventFilters.ts

---

### D6 — Sports Preparation Window

Expanded sports preparation awareness.

Before:
- 12-hour prep window

After:
- 18-hour prep window

Result:
- Evening gear preparation and logistics surface appropriately.

Files:
- preparationWindow.ts

---

### D7 — Google Calendar Pagination

Added support for paginated calendar retrieval.

Changes:
- maxResults increased from 80 to 250
- nextPageToken support added
- MAX_PAGES safeguard added

Result:
- Large calendars no longer silently truncate.

Files:
- googleCalendarApi.ts

---

### D8 — Work Travel Preparation Window

Travel preparation profile expanded beyond family events.

Added:
- summit
- conference
- offsite

Result:
- Work travel receives the same long-range preparation support as personal travel.

Files:
- preparationWindow.ts

---

### Risk B Resolution — Pagination Diagnostics

Added truncation diagnostics for pagination guard activation.

Result:
- Calendar truncation is now observable.
- Partial sync state correctly reflects truncation events.

Files:
- googleCalendarApi.ts
- calendar.ts

---

## Test Coverage

### Calendar Intelligence

- 51 tests
- 51 passing
- 0 failing

### Capture Intelligence

- 46 tests
- 46 passing
- 0 failing

### Focus Intelligence

- 38 tests
- 38 passing
- 0 failing

### TypeScript

- Clean
- 0 errors

---

## Deferred Risks

### Risk A — Child Attribution for Generic Sports Events

Scenario:

- "Home Game"
- "Away Game"
- "Practice"

on calendars where the child name does not appear in the title.

Current behavior:
- No incorrect attribution occurs.
- Attribution may be missing.

Status:
Deferred to V2.

---

### Risk C — Conference Keyword Travel Window

Scenario:

Conference-style events may qualify for travel preparation.

Current behavior:
- Household relevance filtering prevents practical false positives.

Status:
Accepted.

---

## Architectural Notes

### Accepted Limitation

Football, volleyball, and cheer events without identifiable child signals may not receive child attribution.

This is preferable to incorrect attribution.

---

### Pagination Guard

Current limit:

- 250 events per page
- 10 page maximum

Maximum retrieval:

- 2,500 events per calendar sync

If truncation occurs:
- Diagnostics are generated.
- Sync marked partial.

---

## Result

Calendar Intelligence V1 passed adversarial audit, correction pass, re-audit, and pagination diagnostics review.

No known blocking defects remain.

Calendar Intelligence V1 is locked.