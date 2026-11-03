# Greenacres Learjet 60 crash — TikTok news explainer

Vertical 1080×1920, 30 fps, ~45 s. Built with **Remotion** + **Three.js** (`@remotion/three`, `@react-three/fiber`) and **lucide** icons.
Soundtrack is generated procedurally (`scripts/soundtrack.mjs`), so it is royalty-free.

```bash
npm install
node scripts/soundtrack.mjs        # regenerate public/soundtrack.wav
npx remotion studio                # live preview / tweak
npx remotion render src/index.ts CrashNews out/greenacres-learjet-crash.mp4
```

Three.js scenes need WebGL; headless rendering uses the `swangle` renderer (set in `remotion.config.ts`).

## Scenes (facts as of Nov 3, 2026, all preliminary)

| # | Scene | Key facts |
|---|-------|-----------|
| 1 | Hook | 9 dead; jet hit a road in Greenacres, Palm Beach County, Sun Nov 1 |
| 2 | The flight (3D map) | ~12:50 PM ET; Learjet 60 N722BD; Austin → North Eleuthera, Bahamas; 2 crew + 7 passengers; operated by Aurora Aviation dba Upper Jets |
| 3 | Minutes before (3D) | ATC audio: "managing the ice… moderate turbulence"; jolts up to ~700 ft; asked to climb to 37,000 ft |
| 4 | Mayday (3D) | "We are in an overspeed condition, descending…" (quoted by NTSB); ~60° bank; ADS-B descent >32,000 ft/min; last ADS-B altitude 8,750 ft |
| 5 | Impact (3D) | Military Trail & 10th Ave N; crater in roadway; 77 mobile homes / ~600 people evacuated; shelters opened |
| 6 | **New: NTSB** (3D breakup) | Tom Chapman: "some indication that the aircraft was breaking up before impact"; debris field ≈ 0.5 × 0.4 mile; rainwater in crater slowing recovery; weather is the focus; no cause yet |
| 7 | Victims | Adam Robinson, Helen Sharp & their 2 young children (Austin); their caretaker; another couple; pilot Jeff Gregory; co-pilot Nathalia Filgueiras, 20 (named by families/employers) |
| 8 | What's next | Preliminary report expected in ~30 days; witness@ntsb.gov; leave debris in place |

## Sources
- NTSB briefing coverage: [WPTV](https://www.wptv.com/news/palm-beach-county/region-c-palm-beach-county/ntsb-news-conference-learjet-60-crash-in-palm-beach-county/11-2-26), [CBS12](https://cbs12.com/news/local/national-transportation-safety-board-share-new-details-palm-beach-county-learjet-60-emergency-operation-center-crash-greenacres-south-military-trail-co-pilot-identified-nathalia-filgueiras-florida-news), [WFLX](https://www.wflx.com/2026/11/02/ntsb-holds-news-conference-regarding-learjet-60-crash-palm-beach-county/), [PBS/AP](https://www.pbs.org/newshour/nation/evidence-suggests-parts-of-jet-broke-off-before-florida-crash-ntsb-investigator-says), [NBC News](https://www.nbcnews.com/news/us-news/jet-may-experienced-breakup-crashed-florida-killing-9-ntsb-says-rcna607068)
- ATC audio: [CBS News](https://www.cbsnews.com/news/pilot-florida-plane-crash-ice-mayday/), [WFLA](https://www.wfla.com/news/florida/audio-from-jet-that-crashed-in-florida-reveals-pilots-concerns-before-rapid-descent/), [Flightradar24](https://www.flightradar24.com/blog/flight-tracking-news/major-incident/learjet-60-crashes-near-west-palm-beach-florida/)
- Victims: [CNN](https://www.cnn.com/2026/11/02/us/florida-learjet-plane-crash-monday), [KUT](https://www.kut.org/transportation/2026-11-02/austin-plane-crash-florida-learjet-victims-identified-adam-robinson-ntsb-investigation), [ABC News](https://abcnews.com/US/learjet-breaking-crashed-florida-ntsb/story?id=137781527)
- Evacuations: [WPTV](https://www.wptv.com/news/region-c-palm-beach-county/greenacres/fiery-incident-reported-near-military-trail-and-10th-avenue), [CBS12](https://cbs12.com/news/local/ntsb-to-brief-on-deadly-greenacres-jet-crash-as-600-residents-remain-displacedgreenacres-plane-crash-greenacres-jet-crash-learjet-60-crash-military-trail-crash-10th-avenue-north-crash-palm-beach-county-plane-crash-nine-killed-in-plane-crash-600-re)
- Aircraft: [Aviation Safety Network](https://aviation-safety.net/wikibase/584122), [Wikipedia](https://en.wikipedia.org/wiki/2026_Greenacres_Learjet_60_crash)
