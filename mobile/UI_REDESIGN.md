# Whole-App UI/UX Redesign — working spec

Branch: `ui-ux-design`. Lens/source: https://youtu.be/wLJ40GV2XEc (bottom-nav video;
its principles generalized app-wide below). This file is the durable plan — decisions
+ TODOs live here so we never lose state across sessions.

## Scope
Redesign the WHOLE app's look & feel, not just the bottom nav. Screens in play:
Home, Reports, Add-trade (wizard), Raw Data Table, Settings, plus shared chrome
(header, ⋮ tools menu, dock, cards, buttons, inputs, tables, modals).

## Design principles (generalized from the video)
- Clarity & hierarchy: most-important things obvious; one primary action per screen.
- Consistency: one icon style, one type scale, one spacing system, one component set.
- Neutral base, reserved accent: bright color only for key actions/values, not chrome.
- Separate layers: distinguish nav/cards/content via border, bg-shift, or subtle elevation.
- Simplicity: kill clutter, boxes-for-the-sake-of-boxes, and visual noise.
- Accessibility: text & graphical contrast ≥ 3:1 (WCAG); inactive = reduced opacity, not mud.
- Thumb-friendly: tap targets ≥ 44×44; respect safe area / home indicator.
- Motion: tap feedback + smooth state/screen transitions — subtle, not flashy.
- Bottom nav specifics: 3–5 tabs, central CTA, active = ≥2 cues (fill + color), short labels.

## Current identity (what we're starting from)
Neo-brutalist dark: pure-black bg, surfaces #0A0A0A/#111, grey ink, Space Grotesk,
**0 radius, bold borders, hard offset shadows**, green/red ONLY for win/loss values.
Tokens: `src/theme/tokens.ts`. Dock: `src/components/FloatingDock.tsx`.

## Decisions (filled Q by Q)
- **Q1 — Direction: HYBRID** ✅ — clean/modern layout + usability, KEEP a brutalist
  signature so it still reads as this app (not a generic minimal template).
- **Q2 — Shape & elevation: SHARP & BOLD, FLATTER** ✅ — keep 0 radius + bold borders,
  drop heavy hard-offset shadows for flat fills + thin separators.
- **Q3 — Accent: SEPARATE ACTION ACCENT (orange #F5A623)** ✅ — orange drives primary
  actions ON SCREENS; green/red stay PURE win/loss values; idle chrome = grey.
  ↳ REVISED: orange rejected in the NAV (neutral white/grey instead) AND on buttons
    (kept the app's existing white-bg/dark-text convention, e.g. GOT IT / CALCULATE).
    Net: orange is currently NOT used for chrome or buttons. Green/red = P/L only.
- **Q4 — Layers: BOLD BORDERS ON PURE-BLACK** ✅ — OLED #000 everywhere; bold/hairline
  borders draw cards, dock, sections. Layers read by lines, not tone or shadow.
- **Q5 — Type: KEEP SPACE GROTESK** ✅ — one family, tuned scale, no new dependency.
- **Q6 — Density: COMFORTABLE** ✅ — balanced padding, ≥44px taps, cards well separated.
- **Q7 — Nav: CENTER CTA, 4 TABS, ICON-ONLY** ✅ — Home, Reports | ＋ | Data, Settings;
  Add = central orange CTA; Settings promoted from ⋮ into the bar; active = orange filled icon.
- **Q8 — Motion: SUBTLE, NATIVE-DRIVER ONLY** ✅ — tap scale/dim, active indicator
  slide + icon fill, soft screen cross-fade. No ripples/heavy springs (low-spec).
- (per-component specifics decided while building)

## Locked design system (one-glance)
- Hybrid: clean layout, brutalist bones.
- Shape: 0 radius, bold borders, NO hard shadows, flat fills.
- Color: OLED #000 base; orange `#F5A623` = actions + active; green/red = P/L values only; idle = grey.
- Layers: bold/hairline borders (no tone steps, no shadows).
- Type: Space Grotesk, tuned scale.
- Density: comfortable (≥44px taps).
- Nav: bottom bar, bold top rule, center orange CTA, 4 icon-only tabs
  (Home, Reports | ＋ | Data, Settings), active = orange filled icon + sliding mark.
- Motion: subtle, native-driver.

## Build TODOs (in order — check off as we go)
- [x] 1. Tokens (`theme/tokens.ts`): added `action`/`onAction`/`borderStrong`. (kept all old tokens)
- [x] 2. Bottom nav: rebuilt dock — center orange CTA, 4 icon-only tabs, active = orange +
      filled glyph + sliding indicator, bold top rule, flat. Settings promoted into bar.
- [ ] 3. Buttons: square + bold border; primary = orange fill/dark text; secondary = bordered.
- [ ] 4. Inputs: square, bold border, orange focus ring.
- [ ] 5. Cards / stat cards: #000 + bold border, flat, comfortable padding.
- [ ] 6. Raw Data table: bordered, comfortable rows.
- [ ] 7. Screens pass: Home, Reports, Add, Data, Settings — apply tokens/components, kill shadows.
- [ ] 8. Motion: tab-indicator slide + screen cross-fade (native driver).
- [ ] 9. Verify: tsc · expo-doctor · `npm test` · `expo export` bundle.
