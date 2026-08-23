---
name: The Crust & Competition System
colors:
  surface: '#fdf9e9'
  surface-dim: '#dedacb'
  surface-bright: '#fdf9e9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f4e4'
  surface-container: '#f2eede'
  surface-container-high: '#ece8d9'
  surface-container-highest: '#e6e3d3'
  on-surface: '#1c1c13'
  on-surface-variant: '#534434'
  inverse-surface: '#323126'
  inverse-on-surface: '#f5f1e1'
  outline: '#867461'
  outline-variant: '#d8c3ad'
  surface-tint: '#855300'
  primary: '#855300'
  on-primary: '#ffffff'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#ffb95f'
  secondary: '#944a23'
  on-secondary: '#ffffff'
  secondary-container: '#fd9e70'
  on-secondary-container: '#76340e'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#30c88f'
  on-tertiary-container: '#004e34'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#ffdbcc'
  secondary-fixed-dim: '#ffb693'
  on-secondary-fixed: '#351000'
  on-secondary-fixed-variant: '#76330d'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fdf9e9'
  on-background: '#1c1c13'
  surface-variant: '#e6e3d3'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '900'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  stats-number:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '900'
    lineHeight: 40px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is built for a high-energy, competitive culinary event. The visual narrative combines **High-Contrast Bold** aesthetics with **Tactile** elements to celebrate the art of the sandwich. It is designed to feel festive yet organized, leaning into the excitement of a championship.

The brand personality is authoritative about its "No Burgers" stance while remaining approachable and playful. The UI should evoke the feeling of a premium deli menu crossed with a high-stakes sports leaderboard. Whitespace is used strategically to keep the bold elements from becoming overwhelming, maintaining a clean, mobile-first experience that prioritizes rapid interaction and food photography.

## Colors

The palette is derived from artisanal ingredients. **Sandwich Orange** serves as the high-energy primary driver for calls to action and critical tournament updates. **Crust Brown** provides the structural grounding, used for deep contrast and sophisticated typography. **Lettuce Green** acts as the accent for "success" states, health-checks, and "Umami" analytics peaks.

The background uses **Warm Paper White** to simulate the butcher paper of a premium sandwich shop, reducing eye strain compared to pure white while maintaining high vibrance. In dark mode, the system shifts to **Deep Espresso**, maintaining the primary orange for high visibility.

## Typography

Typography is the "meat" of this system. **Montserrat** is utilized for all headlines to provide a punchy, geometric, and modern competitive feel. Heavy weights (800-900) are preferred for tournament headings to ensure they dominate the visual hierarchy.

**Inter** is used for all functional text, body copy, and metadata. It provides a systematic, neutral counterpoint to the loud headlines. For "Umami" analytics and scoreboards, the `stats-number` style ensures maximum legibility during fast-paced competition updates. All mobile headlines are scaled to fit within a 4-column portrait grid without excessive wrapping.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for mobile-first consumption. On mobile, a 4-column system with 16px margins is standard. On desktop, this expands to a 12-column system capped at 1200px width.

Spacing follows an 8px rhythmic scale. To emphasize the "High-Energy" personality, vertical spacing between major sections (`xl`) is generous to let bold typography breathe. Touch targets for all interactive elements are a minimum of 48x48px. Data-heavy views (like the sandwich bracket) use the `sm` spacing for density while maintaining clear boundaries.

## Elevation & Depth

This system uses **Tonal Layers** combined with **Low-Contrast Outlines**. Rather than traditional heavy shadows, depth is achieved by stacking cards of slightly different saturations or using a 2px "Crust Brown" border to ground elements.

For "Birthday" festive highlights, a soft, colored ambient shadow (using a low-opacity Primary Orange) is permitted to give the impression that the element is glowing or "hot off the press." Media assets from MinIO should be treated as the top-most visual layer, often breaking the grid or using slight rotation to feel more scrapbook-like and energetic.

## Shapes

The shape language is defined by **Extreme Roundedness**. While the base `roundedness` is set to 2 (0.5rem), primary containers and competition cards must use `rounded-2xl` (1.5rem) to evoke a friendly, "soft-bread" feel that contrasts against the sharp, bold typography.

Buttons and input fields follow the `rounded-xl` standard. Iconography should be thick-stroked with rounded ends to match the weight of the Montserrat typeface.

## Components

### Buttons & Interaction
- **Primary Button:** Solid `Primary Orange`, `Crust Brown` text, `rounded-xl`. On hover/active, use a slight 2px downward shift to simulate a "tactile" press.
- **Secondary Button:** `Warm Paper White` background with a 2px `Crust Brown` border.

### Cards (The "Sandwich" Container)
- All cards use a 1.5rem corner radius.
- **MinIO Media Cards:** High-quality food imagery should be full-bleed at the top of the card with a 12px internal padding for the text content below.
- **Tournament Brackets:** Use `Secondary Brown` for lines connecting match-up cards to maintain a structured, organized feel.

### Analytics & Labels
- **Umami Stats:** Displayed in "Lettuce Green" against a "Deep Espresso" or "Warm Paper" background. Use the `stats-number` type scale.
- **"No Burgers" Badges:** A strict, red-pill label used to flag any non-compliant entries in the competition feed.

### Input Fields
- Inputs feature a 2px border in `Crust Brown`. Focus states glow with a `Primary Orange` outer halo.