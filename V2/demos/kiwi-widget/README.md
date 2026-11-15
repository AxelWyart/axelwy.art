# Mindsay conversational widget

A self-contained React demo embedded in `/work/mindsay` under Conversational interfaces.

```sh
npm ci
npm run dev
npm run typecheck
npm run build
```

Development URL: http://127.0.0.1:4192/V2/kiwi-widget/

The build writes static files into `V2/kiwi-widget/`. Its absolute asset base supports the site's clean URLs. The widget plays once when visible, provides Replay, and hands control to visitors when they choose a flight. Reduced motion shows the completed itinerary.

See PLAN.md, REHEARSAL.md and NOTICE.md. The reference folder preserves the copied Stageshow ai-cards starting point; it is not included in the shipping bundle.
