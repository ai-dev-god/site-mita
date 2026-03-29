# La Mița Biciclista — Design System

This file is the single source of truth for all LMBSC visual artifacts. It covers two distinct surfaces:

1. **Marketing Site** — the public-facing landing page (`index.html`)
2. **Hospitality Platform** — the internal SaaS (Next.js 15 app) for hosts, admins, and guests

---

## Part 1: Marketing Site Design System

### Brand Identity
Sophisticated Romanian café/brasserie/salon. European boutique aesthetic. Premium, type-forward, minimalist.

### Typography
- **Primary:** Manrope (variable, 200–800) — headings, body, labels
- **Secondary:** Fira Code (variable, 300–700) — accents, monospace labels

#### Scale (fluid with CSS clamp)
| Token | Value |
|---|---|
| `--text-sm` | `0.875rem` |
| `--text-md` | `clamp(1rem, 1vw + 0.8rem, 1.125rem)` |
| `--text-lg` | `clamp(1.125rem, 1.2vw + 0.9rem, 1.375rem)` |
| `--text-xl` | `clamp(1.75rem, 2vw + 1rem, 2rem)` |
| `--text-2xl` | `clamp(2.15rem, 3vw + 1rem, 3rem)` |
| `--text-hero` | `clamp(3.5rem, 7vw + 1rem, 7rem)` |

### Color Palette
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

### Spacing
`4px` base unit. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.

### Components
- **Buttons:** Uppercase, Manrope 700, letter-spacing 0.1em, no border-radius (sharp/square)
- **Section labels:** Fira Code, small caps, gray, letter-spacing 0.2em
- **Cards:** Minimal border, flat, no shadow — color blocks define hierarchy

### Layout
- Desktop: 1440px max-width, 80px horizontal padding
- Single-page vertical scroll
- CSS Grid + Flexbox

### Page Sections (in order)

1. **Nav** — Fixed, transparent, logo + RESERVATIONS button + RO/EN toggle
2. **Hero** — Full-viewport, brand-navy bg, huge STABILIMENT CREATIV headline
3. **Content Story Flow** — Three editorial blocks: BRASSERIE (01/PARTER), SALON ISTORIC (02/ETAJ 1), EXPO (03/EXPO)
4. **Viennoiserie & Cofetărie** — White bg, 2-col: shop copy + single "EXPLOREAZĂ MENIURILE" outlined CTA
5. **#meniuri — Integrated Menus**
   - Dark brand-navy bg (#2E3192)
   - Section label: Fira Code "MENIURILE NOASTRE" brand-yellow/60; headline: Manrope ExtraBold "MENIURI"
   - Tab bar: BRASSERIE · MIC DEJUN · PRINCIPAL · BĂUTURI — active tab: brand-yellow text + 2px border
   - Tab panels: 2-col grid of categories with item rows (name | description | price)
   - Allergen footer: Fira Code 9px white/20 uppercase
6. **Footer** — brand-navy, logo, address, newsletter input, social links

### Interaction Notes
- `switchMenu(id)` — pure JS, no framework; toggles active tab styles and panel visibility
- Tab bar uses `overflow-x: auto` for mobile horizontal scroll

---

## Part 2: LMBSC Hospitality Platform Design System

### Overview
Internal SaaS used by hosts, admins, servers, and guests. Stack: Next.js 15 (App Router) + Tailwind CSS v4 + shadcn/ui.
Aesthetic: Parisian brasserie — warm, refined, historic. Inspired by the venue at Str. Biserica Amzei 9, Bucharest.

---

### 2.1 Brand Tokens

```css
/* Core brand */
--color-primary:        #2C4A2E;   /* Forest green — primary actions, nav, active states */
--color-primary-light:  #4A7A4C;   /* Lighter green — hover states */
--color-primary-muted:  #EAF0EA;   /* Very light green — selected bg, table available */
--color-accent:         #B8962E;   /* Brass gold — reserved, secondary CTA, badges */
--color-accent-light:   #F5E9C4;   /* Pale gold — reserved table bg */
--color-surface:        #FAF6F0;   /* Warm off-white — page background */
--color-surface-raised: #FFFFFF;   /* Pure white — card surfaces */
--color-text:           #1A1A1A;   /* Near black — primary text */
--color-text-secondary: #5A5A5A;   /* Mid gray — secondary text, metadata */
--color-text-muted:     #9A9A9A;   /* Light gray — placeholder, disabled */
--color-border:         #E4DDD5;   /* Warm border — dividers, inputs */
--color-border-focus:   #2C4A2E;   /* Forest green — focus rings */

/* Semantic / Status */
--color-seated:         #2C4A2E;   /* Forest green — table occupied */
--color-seated-bg:      #EAF0EA;   /* Light green bg */
--color-available:      #4A7A4C;   /* Mid green — table free */
--color-available-bg:   #F0F7F0;   /* Very pale green bg */
--color-reserved:       #B8962E;   /* Brass gold — pre-booked */
--color-reserved-bg:    #FBF4E3;   /* Pale gold bg */
--color-turning:        #D97706;   /* Amber — clearing, transitioning */
--color-turning-bg:     #FEF3C7;   /* Pale amber bg */
--color-blocked:        #6B7280;   /* Cool gray — out of service */
--color-blocked-bg:     #F3F4F6;   /* Light gray bg */
--color-error:          #DC2626;   /* Red — errors, danger actions */
--color-error-bg:       #FEE2E2;   /* Pale red bg */
--color-warning:        #D97706;   /* Amber — warnings */
--color-success:        #2C4A2E;   /* Forest green — confirmations */

/* Typography */
--font-display:         'Playfair Display', Georgia, serif;  /* Headings, modal titles */
--font-body:            'Inter', -apple-system, sans-serif;  /* UI copy, labels, inputs */
--font-mono:            'JetBrains Mono', 'Fira Code', monospace; /* Codes, IDs */
```

---

### 2.2 Typography Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `text-display` | 2.25rem (36px) | 700 | Page titles, modal headings (Playfair Display) |
| `text-heading` | 1.5rem (24px) | 600 | Section headings (Inter) |
| `text-subheading` | 1.125rem (18px) | 600 | Card titles, sidebar headers (Inter) |
| `text-body` | 1rem (16px) | 400 | Body copy, form labels (Inter) |
| `text-sm` | 0.875rem (14px) | 400 | Secondary info, table cells (Inter) |
| `text-xs` | 0.75rem (12px) | 500 | Badges, tags, status labels (Inter, uppercase) |
| `text-caption` | 0.6875rem (11px) | 400 | Metadata, timestamps (Inter) |

---

### 2.3 Spacing & Radius

```
Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px
Border radius:
  --radius-sm:   4px    (inputs, badges)
  --radius-md:   8px    (cards, dropdowns)
  --radius-lg:   12px   (modals, panels)
  --radius-full: 9999px (pills, avatars)
```

---

### 2.4 Elevation

```
--shadow-sm:  0 1px 2px rgba(44,74,46,0.06)              (subtle card lift)
--shadow-md:  0 4px 12px rgba(44,74,46,0.10)             (dropdowns, toasts)
--shadow-lg:  0 8px 32px rgba(44,74,46,0.14)             (modals, popovers)
```

---

### 2.5 Component Specifications

#### Buttons
| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| Primary | `--color-primary` (#2C4A2E) | white | none | `--color-primary-light` |
| Secondary | transparent | `--color-primary` | 1.5px `--color-primary` | `--color-primary-muted` bg |
| Ghost | transparent | `--color-text-secondary` | none | `#F5F5F5` bg |
| Danger | `--color-error` | white | none | `#B91C1C` |
| Accent | `--color-accent` | white | none | `#9A7A26` |

All buttons: Inter 600, 14px, letter-spacing 0.01em, radius `--radius-sm`, height 36px (sm) / 40px (md) / 44px (lg). Keyboard-focusable with 2px `--color-border-focus` ring, 2px offset.

#### Form Inputs
- Height: 40px; padding: 10px 12px
- Background: white; border: 1.5px `--color-border`; radius: `--radius-sm`
- Focus: border `--color-border-focus`, shadow `0 0 0 3px rgba(44,74,46,0.12)`
- Error: border `--color-error`, bg `--color-error-bg`
- Label: Inter 500 12px uppercase letter-spacing 0.08em, color `--color-text-secondary`
- Placeholder: `--color-text-muted`

#### Table Status Badges
```
Seated    → bg: #EAF0EA, text: #2C4A2E, border: #2C4A2E/30
Available → bg: #F0F7F0, text: #4A7A4C, border: #4A7A4C/20
Reserved  → bg: #FBF4E3, text: #B8962E, border: #B8962E/30
Turning   → bg: #FEF3C7, text: #D97706, border: #D97706/30
Blocked   → bg: #F3F4F6, text: #6B7280, border: #6B7280/20
```
All badges: Inter 600 11px, uppercase, letter-spacing 0.08em, padding 3px 8px, radius `--radius-sm`.

#### Cards
- Background: white; border: 1px `--color-border`; radius: `--radius-md`; padding: 16px
- Hover: `--shadow-sm`; transition: box-shadow 150ms ease
- **Reservation Card:** guest name (text-subheading) + date/time/party row (text-sm, `--color-text-secondary`) + zone badge + status badge
- **Guest Profile Card:** avatar circle + name + visit count + last visit + VIP tag
- **Table Card (floor view):** table number large (text-heading) + status badge + time-seated counter + party size

#### Navigation — Admin Sidebar
- Width: 240px; background: `--color-primary` (#2C4A2E); height: 100vh; padding: 0
- Logo area: 64px height, centered, `filter: brightness(0) invert(1)`
- Nav items: Inter 500 14px, white/80; height 44px; padding 0 20px; icon 18px
- Active item: white/100 text, left 3px solid `--color-accent`, bg white/10
- Hover: bg white/8
- Section dividers: white/15, 1px

#### Navigation — Host Top Bar
- Height: 64px; background: white; border-bottom: 1px `--color-border`; padding: 0 24px
- Left: date/shift info (Playfair Display 18px `--color-primary`)
- Center: quick stats chips (covers, tables, queue)
- Right: check-in button (Primary) + clock

#### Modals
- Overlay: rgba(0,0,0,0.45) backdrop-blur-sm
- Container: white, radius `--radius-lg`, `--shadow-lg`, max-width 480px (sm) / 640px (md)
- Header: Playfair Display 24px + close button (X, ghost)
- Body: 24px padding, Inter 16px
- Footer: border-top, right-aligned button row

#### Toast Notifications
- Fixed bottom-right, 16px margin; width 320px; `--shadow-md`; radius `--radius-md`
- Types: success (left 4px solid `--color-success`), error (left 4px solid `--color-error`), warning (left 4px solid `--color-warning`), info (left 4px solid `--color-primary`)
- Auto-dismiss after 4s; manual X dismiss

---

### 2.6 Layout Grid

```
Admin dashboard:  sidebar (240px) + main (flex-1), full-height
Host dashboard:   top-bar (64px) + floor-view + queue-sidebar (300px)
Guest booking:    single-column, max-width 420px, centered, mobile-first
Breakpoints:
  sm:  640px
  md:  768px
  lg:  1024px (tablet — host station primary target)
  xl:  1280px
  2xl: 1440px
```

---

### 2.7 Accessibility (WCAG 2.1 AA)

- All text on colored backgrounds must meet 4.5:1 contrast ratio (7:1 for AAA)
- Interactive elements: minimum 44×44px touch target
- Focus styles: visible 2px ring on all interactive elements (never `outline: none` without replacement)
- Status conveyed by both color AND icon/text (never color alone)
- ARIA labels on icon-only buttons
- Form inputs: always have associated `<label>` (visible or sr-only)
- Keyboard navigation: logical tab order, Escape closes modals/toasts

---

### 2.8 Screens Generated

| File | Screen | Viewport | Status |
|---|---|---|---|
| `designs/lmbsc-host-dashboard.html` | Host Dashboard — live floor view | 1024px (tablet) | ✅ Generated |
| `designs/lmbsc-reservation-widget.html` | Reservation Booking Widget | 390px (mobile) | ✅ Generated |
| `designs/lmbsc-component-library.html` | Admin Component Library | 1440px (desktop) | ✅ Generated |
| `designs/index.html` | Marketing landing page | responsive | ✅ Existing |
