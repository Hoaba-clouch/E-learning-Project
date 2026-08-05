# Design System Strategy: The Editorial Scholar

## 1. Overview & Creative North Star
The "Editorial Scholar" is our Creative North Star. Most e-learning dashboards feel like spreadsheets—cold, rigid, and transactional. We are moving away from the "software" aesthetic toward a "digital publication" feel. 

This design system prioritizes intellectual clarity through **The Breathable Canvas**. We break the traditional admin grid by using intentional asymmetry and significant shifts in typographic scale. By treating the dashboard as a high-end educational journal rather than a database, we foster a sense of calm authority. We replace rigid structural lines with tonal depth, allowing the content to float in a curated, multi-layered space.

---

## 2. Colors & Tonal Architecture
Our palette isn't just a set of fills; it’s a system of light and atmospheric depth.

### The Color Logic
*   **Surface Hierarchy:** We utilize `surface` (#f9f9f9) as our base. To define areas of focus, we shift through the `surface_container` tiers rather than drawing lines.
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely by color shifts. For example, a sidebar should be `surface_container_low`, sitting against a `surface` main content area.
*   **The Glass & Gradient Rule:** To ensure the system feels bespoke, use `surface_container_lowest` (#ffffff) with a 70% opacity and a `backdrop-blur` of 20px for floating navigation bars or modals. This "Glassmorphism" ensures the UI feels integrated into the environment.
*   **Signature Textures:** For primary CTAs, do not use flat hex codes. Apply a subtle linear gradient from `primary` (#004ac6) to `primary_container` (#2563eb) at a 135-degree angle. This adds a "lithographic" depth that signals premium quality.

---

## 3. Typography: The Editorial Voice
We use a dual-typeface system to create a sophisticated hierarchy. 

*   **Display & Headlines (Manrope):** Our "Authoritative" voice. Use `display-lg` and `headline-md` for page titles and high-level stats. These should be set with a slightly tighter letter-spacing (-0.02em) to mimic high-end print titles.
*   **Body & Labels (Inter):** Our "Functional" voice. Inter provides exceptional readability at small scales. 
*   **Intentional Contrast:** Pair a `headline-lg` (Manrope, Bold) title with a `body-md` (Inter, Regular) description. The drastic jump in scale creates an editorial rhythm that guides the eye naturally through the lesson data.

---

## 4. Elevation & Depth: Tonal Layering
In this design system, shadows are a last resort, not a default. 

*   **The Layering Principle:** Depth is achieved by "stacking." 
    *   *Level 0:* `surface_dim` (The deep background)
    *   *Level 1:* `surface` (The main canvas)
    *   *Level 2:* `surface_container_lowest` (The active card or module)
*   **Ambient Shadows:** When a "floating" element (like a dropdown) requires a shadow, use a multi-layered shadow: `0 8px 32px rgba(26, 28, 28, 0.06)`. This mimic natural, ambient light.
*   **The "Ghost Border" Fallback:** If a container requires definition against a similar background, use a "Ghost Border": `outline_variant` at 15% opacity. Never use a 100% opaque border.

---

## 5. Components & Interface Patterns

### Buttons & CTAs
*   **Primary:** Linear gradient (`primary` to `primary_container`), `md` (0.75rem) border-radius, and a soft glow on hover using a 10% opacity version of the primary color as a shadow.
*   **Tertiary:** Transparent background with `on_surface_variant` text. High-end interfaces use "less" to signal "more."

### Input Fields & Search
*   **Style:** No borders. Use `surface_container_high` as the background fill. Upon focus, transition the background to `surface_container_lowest` and apply a 1px "Ghost Border" of `primary`.
*   **Focus:** Smooth 200ms ease-in-out transition for all states.

### Cards & Content Modules
*   **The Rule of Separation:** Forbid the use of divider lines within cards. Separate content using the Spacing Scale (e.g., a `3` (1rem) gap between a header and body).
*   **Learning Progress Cards:** Use `tertiary_container` for progress bar backgrounds and `tertiary` for the fill to provide a sophisticated "Soft Orange" highlight that doesn't scream "Warning."

### Specialized E-Learning Components
*   **The Course Tray:** A horizontally scrolling list of cards using `surface_container_low` background with `xl` (1.5rem) border radius for a friendly, approachable feel.
*   **Curated Stats:** Large `display-sm` numbers in `primary` color, paired with `label-md` uppercase descriptions.

---

## 6. Do’s and Don’ts

### Do
*   **Use White Space as a Tool:** Use the `12` (4rem) spacing token between major sections to give the user's brain room to process information.
*   **Embrace Asymmetry:** Align primary content to a 12-column grid, but allow decorative elements or secondary stats to break the "box" to create visual interest.
*   **Subtle Animation:** Use "Micro-elevations." When hovering over a card, it should lift 4px and its ambient shadow should soften further.

### Don’t
*   **Don't use pure black:** Use `on_background` (#1a1c1c) for text to maintain a softer, more editorial feel.
*   **Don't use hard dividers:** If you feel the need to draw a line, try using a `2.5` (0.85rem) gap instead.
*   **Don't crowd the margins:** Ensure a minimum of `8` (2.75rem) padding on the main dashboard container edges.