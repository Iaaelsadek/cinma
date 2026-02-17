# LUMEN — Design System

## Concept & Philosophy

**LUMEN** (Latin: *light*) is a design language built around one idea: **light through darkness**.  
It mimics the experience of a premium cinema — a dark room, a single beam of light, warm projection tones, and no visual noise. It feels *alive* because of subtle motion and depth, *cinematic* because of contrast and typography, and *futuristic* because of crisp UI and soft tech accents — without looking like another purple/cyan streaming clone.

### Pillars
- **Void-first:** Near-black (#08080C) is the canvas. UI and content are "light" that appears on it.
- **One accent:** A single warm metallic — **Lumen Gold** (#C9A962) — used sparingly for CTAs, focus states, and key highlights. No neon rainbow.
- **Warm neutrals:** Cream (#E8E4DC), warm grays (#1C1B1F), and a hint of film-amber in gradients.
- **Depth without images:** Mesh gradients, soft blurs, and CSS-only "grain" and "vignette" create atmosphere.
- **Universal focus:** Thick, high-contrast focus rings (and optional scale) so the UI is fully navigable by remote (TV), touch (tablet/mobile), and mouse/keyboard (desktop).

---

## Color Palette

| Role        | Token           | Hex       | Use |
|------------|-----------------|-----------|-----|
| Void       | `lumen-void`    | `#08080C` | Page background |
| Surface    | `lumen-surface` | `#0F0F14` | Cards, panels |
| Muted      | `lumen-muted`   | `#1C1B1F` | Borders, secondary surfaces |
| Cream      | `lumen-cream`   | `#E8E4DC` | Primary text, headings |
| Silver     | `lumen-silver`  | `#A8A5A0` | Secondary text |
| Gold       | `lumen-gold`    | `#C9A962` | Accent, CTAs, focus |
| Gold-dim   | `lumen-gold/20` | —         | Hover states, soft glow |

---

## Typography

- **Headings (EN):** Syne — geometric, slightly cinematic.
- **Body / UI (EN):** DM Sans — clean, highly readable.
- **Arabic:** Cairo (unchanged) for RTL.

Weights: 400 (body), 600 (semibold), 700 (bold), 800 (hero titles).

---

## Motion & Micro-interactions

- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` for most transitions (ease-out-expo feel).
- **Hover (cards):** Slight scale (1.02–1.05), soft gold border/glow, 300ms.
- **Focus (TV/accessibility):** 3px outline in `lumen-gold`, optional scale 1.02.
- **Hero:** Subtle parallax or scale on background; title and CTA fade/slide up with stagger.
- **No heavy JS animations:** Prefer CSS `transform` and `opacity` for performance.

---

## Layout Principles

- **Hero:** Full-viewport, backdrop image with CSS vignette + grain overlay; title and meta bottom-left (or right in RTL); one primary CTA (gold), one secondary (outline).
- **Cards:** Poster 2:3, rounded corners (12–16px), thin border (lumen-muted), on hover: gold border + soft shadow. No heavy glass on every card to keep weight down.
- **Spacing:** Generous padding on TV (e.g. 48px), tighter on mobile; consistent 4px grid.

---

## Technical Constraints Respected

1. **Universal compatibility:** Focus states and hit areas work for remote (arrow keys), touch, and pointer.
2. **Performance:** No large image assets for the system; gradients, blur, and SVG/CSS grain only.
3. **Premium feel:** Restraint in color and motion; one strong accent and clear hierarchy.

---

*LUMEN design system — Cinema Online.*
