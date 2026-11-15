# Rehearsal: Kiwi.com conversational widget

Gold: Stageshow ai-cards, copied before customization and filmed at `/tmp/kiwi-gold.png`. Retained kit Thread/Bubble, Collapse card motion, States for action feedback, measured cursor clicks and a completed-result poster. Replaced the desktop AI layout with the supplied dark-headed portrait widget, a Kiwi.com customer scenario and a second compact layout.

Beats: two flight choices → select earliest → confirm → changing flight → confirmed itinerary. About 12 seconds including reading time; once in view, with explicit Replay. Actual user selection stops the authored cursor sequence and lets either flight complete. The sample is labeled fictional.

Captured: wide 520px design and compact 358px design at 390px viewport; all named states; reduced motion; local production build inside the Mindsay case page. Light widget on the portfolio's neutral gallery ground. No dark widget variant is shipped.

Artifacts on the author's machine:
- `/tmp/kiwi-final-wide.png` and `.json`: wide sequence and states.
- `/tmp/kiwi-final-mobile.png` and `.json`: compact sequence and states.
- `/tmp/kiwi-review-confirmed.png`: confirmation transition at 80ms steps.
- `/tmp/kiwi-review-booking.png`: booking transition.
- `/tmp/kiwi-review-glyphs.png`: header glyphs at 4x.
- `/tmp/kiwi-review-spinner-fixed.png`: independently reviewed light loading arc.
- `/tmp/kiwi-poster-shipping.png`: final reduced-motion built poster.
- `/tmp/kiwi-host-layout.json`: 390px host embed check.

Fixes: hidden Collapse descendants initially inflated scrollHeight. Scrolling now follows the measured visible content height, eases its movement and settles with the assistant's reply and result in view. Added a top history fade, full loading contrast, even icon boxes, clean-URL-safe assets, inert hidden detail/support controls, and booking-timer cleanup for Replay. Container queries size the host iframe from its actual width. Resize handling observes both the transcript and viewport, normalizes stage scaling, and disables native scroll anchoring so card collapse does not undo the authored scroll.

Review: independent fresh-eye review found one faint spinner; changed its token to white and kept the busy button opaque, then reviewer verified the fix. No remaining framing or hierarchy findings. The supplied full widget frame is intentionally retained, matching the user's reference.

Automated gate: NOT green. Wide/mobile captures had a few sampling gaps of 33–38ms. The scanner also treats multiline kit bubbles as one-line fat rows and measures nested cards against scrolling ancestors as unequal outer gutters/padding. These findings were inspected in the frames by both builder and reviewer; the reviewer found no corresponding visible spacing defect. They were not suppressed with data-snap/crop markers. The built CSS scanner also attributes some unchanged kit bubble rules to the demo after bundling. The gate is recorded as inconclusive rather than passed. The host layout scanner checked zero supported controls because its selected wrapper contains an iframe; the embed was verified visually instead.

Checks: production build and TypeScript pass; CSS namespace check passes. Browser checks cover both flight selections, confirmation, itinerary expansion, support view, minimize/restore and Replay. Confirmed the widget in the actual case-page iframe. The standalone route is noindex; the case page keeps its canonical URL.

Assumptions: Kiwi.com is a suitable alternate Mindsay customer, as already represented on the portfolio's Mindsay website visual. All travel content is fictional.

Not checked: physical touch hardware, Safari/Firefox, a full frame-by-frame capture of every possible manual interaction, live booking or live support (neither exists).
