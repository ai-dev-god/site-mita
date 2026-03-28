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
