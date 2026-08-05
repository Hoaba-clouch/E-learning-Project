# Design System Strategy: The Academic Atelier

## 1. Overview & Creative North Star
**Creative North Star: The Editorial Scholar**
This design system rejects the "commodity" look of generic e-learning templates in favor of a high-end, editorial experience. We treat digital education not as a database of videos, but as a curated gallery of knowledge. By leveraging intentional asymmetry, expansive negative space, and a sophisticated layering of whites and blues, we move beyond the "grid of cards" to create a platform that feels authoritative, serene, and deeply premium.

The "Editorial Scholar" approach uses high-contrast typography scales (the interplay between the structural `Manrope` and the functional `Inter`) to guide the eye through complex information without the need for heavy-handed UI scaffolding.

---

2. Colors & Tonal Depth
Our palette is rooted in a "Pure & Professional" ethos. We use blue not as a decoration, but as a functional signal of progress and intellectual trust.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning content. To define boundaries, you must use background shifts. 
*   Example: A `surface-container-low` section sitting against a `surface` background. 
*   This creates a "molded" look rather than a "boxed" look, making the UI feel like a single, cohesive object.

### Surface Hierarchy & Nesting
Think of the UI as layers of fine vellum paper. Use the Material tokens to create depth:
*   **Base:** `surface` (#f8f9fa) for the main body.
*   **Level 1 (Sub-sections):** `surface-container-low` (#f3f4f5).
*   **Level 2 (Active Cards):** `surface-container-lowest` (#ffffff).
By nesting `#ffffff` cards inside a `#f3f4f5` section, you achieve "natural lift" without a single drop shadow.

### The "Glass & Gradient" Rule
To elevate hero sections and floating navigation, use Glassmorphism. Apply a `background: rgba(255, 255, 255, 0.7)` with a `backdrop-blur: 20px`. For primary CTAs, avoid flat hex codes; use a subtle linear gradient from `primary` (#005bbf) to `primary_container` (#1a73e8) at a 135-degree angle to provide "visual soul."

---

## 3. Typography: The Intellectual Contrast
We use a dual-font system to balance character with legibility.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern "tech-academic" feel. Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) for landing pages to create an immediate sense of scale.
*   **Titles & Body (Inter):** Chosen for its exceptional readability at small scales. Inter handles the heavy lifting of course descriptions and interface labels.
*   **Hierarchy as Brand:** Use `headline-sm` in `primary` (#005bbf) for category headers to anchor the page, while keeping `body-md` in `on_surface_variant` (#414754) to ensure long-form reading doesn't cause eye fatigue.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are a last resort. We define hierarchy through the **Layering Principle**.

*   **The Layering Principle:** Stack `surface-container-lowest` (#ffffff) on top of `surface-container` (#edeeef). The 2% shift in brightness is enough for the human eye to perceive a change in plane without visual clutter.
*   **Ambient Shadows:** Where floating elements are required (e.g., a "Current Lesson" hover state), use a shadow with a 40px blur, 0% spread, and 6% opacity. Use the `on_surface` color as the shadow tint—never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline_variant` at 15% opacity. This "Ghost Border" provides a hint of structure without breaking the minimalist flow.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Radius: `md` (0.75rem). High-contrast `on_primary` text.
*   **Secondary:** `secondary_container` background with `on_secondary_container` text. No border.
*   **Tertiary:** Text-only with a `primary` color. On hover, apply a `surface-container-high` background pill.

### Cards & Learning Modules
*   **Forbidden:** Divider lines between card sections.
*   **Action:** Use a `2.5rem` (spacing 10) vertical gap to separate the "Course Title" from the "Instructor Info." 
*   **Structure:** Use a `surface-container-lowest` (#ffffff) base with a `lg` (1rem) corner radius.

### Course Progress Chips
*   Use `primary_fixed` (#d8e2ff) backgrounds with `on_primary_fixed` (#001a41) text. These should be capsule-shaped (`full` roundedness) to contrast against the architectural squareness of the cards.

### Input Fields
*   Background: `surface-container-low`. 
*   Border: None (use a bottom-only `outline_variant` at 20% opacity for an editorial "form" feel).
*   Focus State: A `2px` solid `primary` bottom border with a subtle 4% `primary` tint on the background.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical margins (e.g., a wider left margin for headlines) to create an editorial, magazine-like feel.
*   **Do** use `20` (5rem) or `24` (6rem) spacing for major section breaks to let the content breathe.
*   **Do** use `surface_tint` at 5% opacity for hover states on light backgrounds to keep the "Blue" brand DNA present.

### Don't:
*   **Don't** use 1px solid borders to separate sidebar navigation from the main content; use a `surface-container-low` fill for the sidebar instead.
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#191c1d) to maintain a soft, premium feel.
*   **Don't** use standard "Drop Shadows" from a UI kit. If it looks like a default shadow, it’s too heavy. Soften it.