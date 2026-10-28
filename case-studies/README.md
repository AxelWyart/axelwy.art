# Case-study pages and sheet navigation

Each work preview in `index.html` is an ordinary link to an HTML file in this
folder. Direct visits, reloads, new tabs and visits without JavaScript show that
full document. Static hosting needs no route rewrites or application server.

On the homepage, `case-studies.js` progressively enhances unmodified clicks. It
fetches the linked document and imports its `[data-case-study-content]` article
into a native modal `<dialog>`. `case-studies.css` styles both views. Edit an
article here to update its full page and sheet together. These initial pages
use existing portfolio titles, dates and images; add longer project narratives
inside the articles when ready. Keep their titles, descriptions, sharing tags
and structured data in sync when changing the content.

The layout leads with the project visual, followed by compact previous/next
navigation, project details, an overview and scope. Role information appears
where it is supported by the existing portfolio biography; other projects show
their focus instead. EverAssist pairs the existing onboarding and conversation
screens, and Sneci includes its existing identity visual. Typography uses the
homepage's existing Tailwind utilities (24/32 px headings, 16 px body and 14 px
labels), with the existing 20/32 px introductory text. Color, surfaces and image
shadows use the existing semantic tokens in `style.css`.

Opening a preview creates one history entry with the real case-study URL.
Previous/next project links replace that sheet entry, so Close, Escape or Back
returns directly to the portfolio. Forward reopens the last project. Only
entries created by the current homepage document are treated as sheets.
Standalone pages always offer a normal Back to selected work link, including
when the visitor arrived from another website.

The dialog makes the background inert. Focus starts on the article heading,
wraps through its controls, and returns to the original preview on dismissal.
The page position is restored, carousel motion pauses, and reduced-motion
preferences remove the sliding animation. Modified clicks and company links
retain their normal browser behavior. The top handle supports downward pointer
drags: a sufficient pull or quick downward flick dismisses the sheet; shorter
pulls settle back. It captures the pointer, ignores extra touches, and cancels
on interrupted gestures. The handle also works as a keyboard/click close button.
Failed, invalid or timed-out fetches fall
back to full-page navigation; interrupted requests cannot reopen a stale sheet.
The homepage base URL is pinned before history changes to preserve relative
asset paths. Imported article paths are resolved against their full-page URL.

To add a project, create a full HTML document here with one
`[data-case-study-content]` article and a heading with
`id="case-study-title" tabindex="-1"`. Link to it with `data-case-study` from the
homepage; update adjacent project links, `sitemap.xml` and `llms.txt`.

Run `npm test` for page/link/asset/metadata integrity checks. To preview, serve
the repository root with any static server, for example
`python3 -m http.server 4173`, and open `http://localhost:4173/`.

Browser checks should cover pointer and keyboard opening, Tab/Shift+Tab, Escape,
backdrop and Close, Back/Forward (including during the exit animation), direct
visits/reloads, project-to-project navigation, modified clicks, carousel drags,
mobile layout, dark mode, reduced motion, and slow/failed fetches.
