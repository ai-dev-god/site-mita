# La Mița Biciclista — Design System

## Brand Identity
Sophisticated Romanian café/brasserie/salon. European boutique aesthetic. Premium, type-forward, minimalist.

## Typography
- **Primary:** Manrope (variable, 200–800) — headings, body, labels
- **Secondary:** Fira Code (variable, 300–700) — accents, monospace labels

### Scale (fluid with CSS clamp)
| Token | Value |
|---|---|
| `--text-sm` | `0.875rem` |
| `--text-md` | `clamp(1rem, 1vw + 0.8rem, 1.125rem)` |
| `--text-lg` | `clamp(1.125rem, 1.2vw + 0.9rem, 1.375rem)` |
| `--text-xl` | `clamp(1.75rem, 2vw + 1rem, 2rem)` |
| `--text-2xl` | `clamp(2.15rem, 3vw + 1rem, 3rem)` |
| `--text-hero` | `clamp(3.5rem, 7vw + 1rem, 7rem)` |

## Color Palette
| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#FBFAF3` | Primary background |
| `--color-white` | `#FFFFFF` | Pure white surfaces |
| `--color-black` | `#111111` | Primary text |
| `--color-gray` | `#686868` | Secondary text |
| `--color-border` | `#EEEEEE` | Dividers |
| `--color-yellow` | `#FFEE58` | Primary accent / CTA |
| `--color-pink` | `#F6CFF4` | Exhibition accent |
| `--color-purple` | `#503AA8` | Salon historic accent |
| `--color-blue` | `#2D308C` | Newsletter accent |
| `--color-dark` | `#1A1A1A` | Dark section background |

## Spacing
`4px` base unit. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.

## Components
- **Buttons:** Uppercase, Manrope 700, letter-spacing 0.1em, no border-radius (sharp/square)
- **Section labels:** Fira Code, small caps, gray, letter-spacing 0.2em
- **Cards:** Minimal border, flat, no shadow — color blocks define hierarchy

## Layout
- Desktop: 1440px max-width, 80px horizontal padding
- Single-page vertical scroll
- CSS Grid + Flexbox

---

## Page Sections (in order)

1. **Nav** — Fixed, transparent, logo + RESERVATIONS button + RO/EN toggle
2. **Hero** — Full-viewport, brand-navy bg, huge STABILIMENT CREATIV headline
3. **Content Story Flow** — Three editorial blocks: BRASSERIE (01/PARTER), SALON ISTORIC (02/ETAJ 1), EXPO (03/EXPO)
4. **Viennoiserie & Cofetărie** — White bg, 2-col: shop copy + single "EXPLOREAZĂ MENIURILE" outlined CTA *(updated: removed redundant 4-link download list)*
5. **#meniuri — Integrated Menus** *(new section)*
   - Dark brand-navy bg (#2E3192)
   - Section label: Fira Code "MENIURILE NOASTRE" brand-yellow/60; headline: Manrope ExtraBold "MENIURI"
   - **Tab bar** (horizontal scroll on mobile): BRASSERIE · MIC DEJUN · PRINCIPAL · BĂUTURI — Fira Code 10px uppercase tracking-widest; active tab: brand-yellow text + 2px brand-yellow bottom border; inactive: white/40
   - **Tab panels** (JS `switchMenu(id)` toggles `.hidden`): each shows 2-col grid of categories
     - Category header: Fira Code 10px brand-yellow, border-b white/10
     - Item row: Manrope bold uppercase name | Manrope light white/50 description | Fira Code brand-yellow price (RON)
   - **Allergen footer**: Fira Code 9px white/20 uppercase
6. **Footer** — brand-navy, logo, address, newsletter input, social links

---

## Interaction Notes

- `switchMenu(id)` — pure JS, no framework; toggles active tab styles and panel visibility
- Tab bar uses `overflow-x: auto` for mobile horizontal scroll
- All `href="#meniuri"` anchors call `switchMenu()` to pre-select the correct tab
