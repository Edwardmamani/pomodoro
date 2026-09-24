---
name: Serene Focus
colors:
  surface: '#0f141b'
  surface-dim: '#0f141b'
  surface-bright: '#343941'
  surface-container-lowest: '#090f15'
  surface-container-low: '#171c23'
  surface-container: '#1b2027'
  surface-container-high: '#252a32'
  surface-container-highest: '#30353d'
  on-surface: '#dee2ec'
  on-surface-variant: '#bec9c0'
  inverse-surface: '#dee2ec'
  inverse-on-surface: '#2c3138'
  outline: '#88938b'
  outline-variant: '#3f4942'
  surface-tint: '#7ed8ab'
  primary: '#7ed8ab'
  on-primary: '#003824'
  primary-container: '#46a177'
  on-primary-container: '#00311e'
  inverse-primary: '#006c48'
  secondary: '#ffb59b'
  on-secondary: '#53220e'
  secondary-container: '#6f3722'
  on-secondary-container: '#f1a286'
  tertiary: '#85d6c2'
  on-tertiary: '#00382e'
  tertiary-container: '#4d9f8c'
  on-tertiary-container: '#003028'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#99f5c6'
  primary-fixed-dim: '#7ed8ab'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005235'
  secondary-fixed: '#ffdbcf'
  secondary-fixed-dim: '#ffb59b'
  on-secondary-fixed: '#380d00'
  on-secondary-fixed-variant: '#6f3722'
  tertiary-fixed: '#a0f2dd'
  tertiary-fixed-dim: '#85d6c2'
  on-tertiary-fixed: '#00201a'
  on-tertiary-fixed-variant: '#005144'
  background: '#0f141b'
  on-background: '#dee2ec'
  surface-variant: '#30353d'
typography:
  display-timer:
    fontFamily: Space Grotesk
    fontSize: 88px
    fontWeight: '300'
    lineHeight: 96px
    letterSpacing: -0.04em
  display-timer-compact:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies a meditative, distilled workspace rooted in the union of Scandinavian functional restraint and Japanese spatial intentionality (*Ma*). Designed specifically for a focused Electron desktop environment, the UI recedes effortlessly into the background, stripping away friction, noisy micro-animations, and visual clamor to cultivate deep cognitive absorption.

The aesthetic fuses quiet minimalism with tactile architectural precision:
- **Calm, Low-Stimulus Environment**: Dark charcoal foundations with gentle warm-slate undertones keep eye strain at zero during marathon work sessions.
- **Organic Restraint**: Forest teals, muted deep pines, and delicate touches of warm terracotta anchor the experience in natural, earthy quietude rather than hyperactive SaaS gamification.
- **Physical Desktop Native**: Bespoke desktop titlebar integration, hairline geometric strokes, monospaced tabular timers, and structural surface tiers tailored for uninterrupted macOS and Windows windowed workflows.
- **Strict Anti-Cyberpunk Rule**: No neon glows, no synthetic violet/magenta gradients, no harsh bloom effects. Every transition operates with smooth, deliberate, ease-out mechanical motion.

## Colors

The palette establishes an introspective, distraction-free nocturnal workspace. Color is applied with surgical restraint—reserved for temporal states, completion confirmation, and precise focal cues.

### Core Canvas & Surfaces
- **Canvas (Base)**: `#0E1116` — Deep charcoal with subtle warm-slate resonance, grounding the main window.
- **Surface Layer 1**: `#161B22` — Sidebar, secondary utility panels, and structural grouping.
- **Surface Layer 2**: `#1C222B` — Cards, floating utility pods, modal overlays, and popovers.
- **Surface Active / Inset**: `#222933` — Active row items, sunken input fields, segmented track wells.

### Brand & Functional Accents
- **Primary Accent (Sage / Forest Teal)**: `#3D9970` — Timer in active session, focus state progress rings, key affirmative actions.
- **Deep Pine (Tertiary)**: `#2A7F6E` — Low-emphasis timer tracks, secondary active chips, muted state badges.
- **Warm Terracotta (Secondary)**: `#D98E73` — Break indicators, subtle urgency alerts, paused timers, delicate warm highlight accents.

### Typography & Ink Levels
- **Primary Ink**: `#F0F3F6` — High legibility, crisp off-white for timer readouts, task headers, and active buttons.
- **Secondary Ink**: `#C5CED6` — Subtitles, inactive tabs, body copy, and secondary labels.
- **Muted Ink**: `#8B949E` — Timestamps, hotkey shortcuts, window controls, hairline metadata.

### Borders & Dividers
- **Hairline Subtle**: `rgba(240, 243, 246, 0.07)` — Primary perimeter rules and structural divisions.
- **Hairline Active**: `rgba(61, 153, 112, 0.40)` — Focused inputs and active pill boundaries.

## Typography

Typography balances clean architectural geometry with precise monospace calibration:

- **Display Numbers & Headers (`Space Grotesk`)**: Used for the central countdown display, large metrics, and primary section titles. Its subtle geometric quirks give the interface human warmth while maintaining architectural precision.
- **Interface & Prose (`Plus Jakarta Sans`)**: Clean, humanist curves reduce optical fatigue across task names, user notes, and microcopy.
- **Tabular & Code Readouts (`JetBrains Mono`)**: Strict tabular lining figures for session tallies, session phase counters (e.g., `03 / 04`), keyboard shortcuts (`⌘ + K`), and metadata chips to eliminate numerical jitter during ticking transitions.
- **Lining Figures**: All countdown figures must apply `font-variant-numeric: tabular-nums` to prevent horizontal layout shifting while the seconds decrease.

## Layout & Spacing

The layout is built for native desktop framing within an Electron container:
- **Titlebar Zone**: A top 38px non-draggable/draggable utility zone accommodating custom traffic lights (macOS) or integrated minimize/maximize/close actions (Windows), styled flush with `#0E1116`.
- **Primary Split Layout**:
  - **Sidebar (Collapsible)**: Fixed 280px width containing task backlogs, project filters, and daily progress circles.
  - **Stage Area (Flexible)**: Fluid center canvas dedicated to the circular focal ring and timer stage. Scales seamlessly between minimal HUD floating mode (360x480px) and full productivity studio mode (1200x800px).
- **Rhythm**: Strict 4px/8px modular spacing. Internal padding inside cards and controls strictly follows `space-sm` (8px) for compact pills, `space-md` (16px) for item rows, and `space-xl` (40px) around the primary focal timer.

## Elevation & Depth

To sustain calm and avoid visual clutter, depth is communicated through tonal shifts and razor-thin boundaries rather than heavy drop shadows:

- **Flat Architectural Tiers**:
  - Base layer: `#0E1116`
  - Structural sidebar / panels: `#161B22`
  - Floating panels / card overlays: `#1C222B`
- **Hairline Boundaries**: Rather than standard borders, panels use a 1px border rendered in `rgba(240, 243, 246, 0.06)`. This creates subtle separation against deep backgrounds without harsh delineations.
- **Ambient Focus Glow (Subtle)**: In active timer states, cards and rings do not use vivid drop shadows; instead, an ambient, diffused wash is used: `0 8px 32px rgba(61, 153, 112, 0.08)`.
- **Translucent Frost**: For floating quick-switcher menus or dropdown contexts, a subtle backdrop blur (`backdrop-filter: blur(16px); background: rgba(22, 27, 34, 0.85);`) grounds the element over running timers.

## Shapes

The form language balances soft ergonomic comfort with crisp geometry:
- **Standard Corners (Rounded `0.5rem` / 8px)**: Applied to cards, input containers, modal sheets, and task row selectors.
- **Interactive Controls (Full Pill `9999px`)**: Session switches (Focus / Short Break / Long Break), primary action buttons, filter tags, and play/pause controls adopt full pill geometry for seamless cursor targeting.
- **Circular Hairlines**: The central timer dial is a 1.5px continuous SVG arc circle (`stroke-linecap: round`), maintaining clean geometric precision.

## Components

### Window Titlebar
- **Height**: 38px, Electron draggable (`-webkit-app-region: drag`).
- **Controls**: macOS traffic light spacing offset by 14px horizontally. Custom Windows min/max/close controls rendered in muted `#8B949E` with 0.15s opacity transitions.
- **Center Element**: Micro pill showing current session status (e.g., `● Focus 21:40`) in `label-mono`, allowing instant state checks when the main window is partially obscured.

### Minimal Circular Progress Timer
- **Centerpiece**: 260px diameter (scales to 180px in compact HUD mode).
- **Background Track**: Hairline circle, 1.5px stroke width, colored `#1C222B`.
- **Progress Track**: 2px stroke width, `#3D9970` (Focus) or `#D98E73` (Break), animated with transition timing `stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)`.
- **Center Typography**: Large `display-timer` digits with tabular formatting, paired with a sub-label in `label-mono` displaying completed Pomodoros (`SESSION 02/04`).

### Mode Pill Selector
- **Container**: Inset capsule with background `#161B22`, 1px hairline `rgba(240, 243, 246, 0.06)`, padding `4px`.
- **Items**: Three segmented pills ("Focus", "Short Break", "Long Break").
- **Active State**: Background `#222933`, text color `#F0F3F6`, soft 1px border `rgba(240, 243, 246, 0.1)`.
- **Inactive State**: Background transparent, text color `#8B949E`, hover to `#C5CED6`.

### Primary & Ghost Buttons
- **Primary (Start/Pause)**: Full pill shape, height 44px, min-width 130px. Background `#3D9970`, text `#0E1116`, typography `label-md` with `font-weight: 600`. Hover subtle brightness filter (`filter: brightness(1.08)`).
- **Ghost (Skip / Reset)**: Hairline border `rgba(240, 243, 246, 0.12)`, text `#C5CED6`, background transparent. Hover background `rgba(240, 243, 246, 0.04)`.

### Task Sidebar & Task Items
- **Task Row**: Background `#161B22` on default, transitioning to `#1C222B` on hover with a 1px hairline border. Rounded 8px corners.
- **Check Indicator**: Custom 18px circle, 1.5px border `#3D9970`. Checked state fills `#3D9970` with `#0E1116` micro checkmark icon. Completed text applies strikethrough with `#8B949E`.
- **Metadata Tags**: Micro tags styled in `label-mono-sm`, background `rgba(240, 243, 246, 0.05)`, text `#8B949E`, 4px rounded radius, showing estimated vs elapsed pomodoros (e.g., `🍅 2/4`).

### Form Inputs & Quick-Add
- **Task Add Field**: Inset field, 36px height, background `#12161D`, border 1px `rgba(240, 243, 246, 0.08)`, text `#F0F3F6`, placeholder `#8B949E`. Focus state transitions border to `rgba(61, 153, 112, 0.5)` with zero ring bloom.