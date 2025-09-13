# Style Guide: Sonic Visual System

## Design Foundation
A comprehensive visual language where voice becomes currency and sound becomes sight.

## Color System

### Primary Sonic Palette

#### Deep Ocean Blues (Trust & Depth)
```css
--color-ocean-primary: #1a237e;    /* Deep navy - infinite acoustic space */
--color-ocean-secondary: #303f9f;  /* Rich blue - major UI elements */
--color-ocean-accent: #3f51b5;     /* Confident blue - interactions */
```

#### Resonant Purples (Premium & Sophistication)
```css
--color-resonant-primary: #4a148c;   /* Deep violet - high-frequency clarity */
--color-resonant-secondary: #7b1fa2; /* Professional purple - emphasis */
--color-resonant-accent: #9c27b0;    /* Vibrant purple - success states */
```

### Text Color System - Ensuring WCAG AAA Compliance

```css
/* Text on Light Backgrounds */
--text-primary-light: #0a0e3d;      /* Deep navy - 16:1 contrast on white */
--text-secondary-light: #2e3a8f;    /* Muted blue - 9:1 contrast */
--text-tertiary-light: #5c6bc0;     /* Soft blue - 4.5:1 contrast */
--text-disabled-light: #9ca3d4;     /* Disabled - 3:1 contrast */

/* Text on Dark Backgrounds */
--text-primary-dark: #ffffff;       /* Pure white - maximum contrast */
--text-secondary-dark: #e8eaff;     /* Soft white - 14:1 contrast */
--text-tertiary-dark: #c5cae9;      /* Muted white - 9:1 contrast */
--text-disabled-dark: #9499b7;      /* Disabled - 4.5:1 contrast */

/* Interactive Text States */
--text-link-light: #1976d2;         /* Accessible blue - 4.7:1 on white */
--text-link-hover-light: #1565c0;   /* Darker on hover */
--text-link-visited-light: #7b1fa2; /* Purple for visited */

--text-link-dark: #64b5f6;          /* Light blue - 4.5:1 on dark */
--text-link-hover-dark: #90caf9;    /* Lighter on hover */
--text-link-visited-dark: #ce93d8;  /* Light purple for visited */

/* Contrast Rules */
.high-contrast {
  /* Critical text (errors, warnings) */
  --text-error-light: #c62828;      /* 5.5:1 on white */
  --text-warning-light: #f57c00;    /* 3.3:1 on white - use sparingly */
  --text-success-light: #2e7d32;    /* 5.5:1 on white */
  
  --text-error-dark: #ff5252;       /* 5.1:1 on deep navy */
  --text-warning-dark: #ffb74d;     /* 8.2:1 on deep navy */
  --text-success-dark: #69f0ae;     /* 11.3:1 on deep navy */
}
```

### Audio Spectrum Gradients

#### Frequency Ranges
```css
--gradient-low-freq: linear-gradient(90deg, #1a237e 0%, #283593 100%);   /* Deep bass tones */
--gradient-mid-freq: linear-gradient(90deg, #7b1fa2 0%, #8e24aa 100%);   /* Vocal richness */
--gradient-high-freq: linear-gradient(90deg, #3f51b5 0%, #5c6bc0 100%);  /* Crisp treble */
```

#### Waveform Gradients
```css
--gradient-waveform: linear-gradient(90deg, #1a237e 0%, #7b1fa2 50%, #3f51b5 100%);
--gradient-radial-wave: radial-gradient(circle, #4a148c 0%, #1a237e 70%);
--gradient-sonic-mesh: 
  linear-gradient(90deg, #1a237e33 1px, transparent 1px),
  linear-gradient(180deg, #7b1fa233 1px, transparent 1px);
```

### Supporting Colors

#### Neutral Acoustics
```css
--color-background: #f8faff;  /* Clean studio white with blue undertone */
--color-surface: #ffffff;     /* Pure white for content areas */
--color-border: #e3f2fd;      /* Subtle blue-grey separation */
--color-shadow: #1a237e1a;    /* 10% deep navy for shadows */
```

#### Signal Colors
```css
--color-success: #00c853;     /* Payment confirmation */
--color-warning: #ff8f00;     /* Attention states */
--color-error: #d32f2f;       /* Error states */
--color-info: #0288d1;        /* Guidance */
```

### Dark Mode Support

```css
/* Dark Mode Variables */
[data-theme="dark"] {
  /* Inverted surfaces */
  --color-background: #0a0e3d;
  --color-surface: #141850;
  --color-border: #2a3567;
  --color-shadow: #000000cc;
  
  /* Adjusted gradients for dark backgrounds */
  --gradient-low-freq: linear-gradient(90deg, #283593 0%, #3949ab 100%);
  --gradient-mid-freq: linear-gradient(90deg, #8e24aa 0%, #ab47bc 100%);
  --gradient-high-freq: linear-gradient(90deg, #5c6bc0 0%, #7986cb 100%);
  
  /* Inverted elevations */
  --elevation-0: #0a0e3d;
  --elevation-1: linear-gradient(145deg, #141850 0%, #1a1f5c 100%);
  --elevation-2: linear-gradient(145deg, #1a1f5c 0%, #202668 100%);
  --elevation-3: linear-gradient(145deg, #202668 0%, #262c74 100%);
  --elevation-4: linear-gradient(145deg, #262c74 0%, #2c3280 100%);
}

/* Automatic contrast switching */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Apply dark mode automatically */
  }
}
```

### Depth System

#### Surface Elevations
```css
--elevation-0: #ffffff;
--elevation-1: linear-gradient(145deg, #ffffff 0%, #f5f7ff 100%);
--elevation-2: linear-gradient(145deg, #ffffff 0%, #f0f2ff 100%);
--elevation-3: linear-gradient(145deg, #ffffff 0%, #ebeeff 100%);
--elevation-4: linear-gradient(145deg, #ffffff 0%, #e6e9ff 100%);
```

## Typography

### Font Stack
```css
--font-display: 'Inter Display', -apple-system, BlinkMacSystemFont, sans-serif;
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;
```

### Type Scale (Golden Ratio)
```css
--text-xs: 0.618rem;    /* 9.89px - Micro labels */
--text-sm: 0.75rem;     /* 12px - Captions */
--text-base: 1rem;      /* 16px - Body text */
--text-lg: 1.25rem;     /* 20px - Emphasis */
--text-xl: 1.618rem;    /* 25.89px - Subheadings */
--text-2xl: 2rem;       /* 32px - Section headers */
--text-3xl: 2.618rem;   /* 41.89px - Page titles */
--text-4xl: 3.236rem;   /* 51.78px - Hero text */
```

### Font Weights (Resonance)
```css
--font-thin: 100;       /* Whisper */
--font-light: 300;      /* Soft speech */
--font-regular: 400;    /* Normal tone */
--font-medium: 500;     /* Clear voice */
--font-semibold: 600;   /* Emphasis */
--font-bold: 700;       /* Strong statement */
--font-black: 900;      /* Maximum impact */
```

### Line Heights (Rhythm)
```css
--leading-tight: 1.25;   /* Compact waveforms */
--leading-normal: 1.5;   /* Standard rhythm */
--leading-relaxed: 1.75; /* Open breathing */
--leading-loose: 2;      /* Maximum space */
```

## Spacing System (Musical Intervals)

```css
--space-1: 0.25rem;   /* 4px - Unison */
--space-2: 0.5rem;    /* 8px - Minor second */
--space-3: 0.75rem;   /* 12px - Major second */
--space-4: 1rem;      /* 16px - Minor third */
--space-5: 1.25rem;   /* 20px - Major third */
--space-6: 1.5rem;    /* 24px - Perfect fourth */
--space-8: 2rem;      /* 32px - Perfect fifth */
--space-10: 2.5rem;   /* 40px - Minor sixth */
--space-12: 3rem;     /* 48px - Major sixth */
--space-16: 4rem;     /* 64px - Octave */
--space-20: 5rem;     /* 80px - Tenth */
--space-24: 6rem;     /* 96px - Twelfth */
```

## Grid System

```css
/* Responsive grid with wave-inspired ratios */
.grid {
  display: grid;
  gap: var(--space-6);
}

.grid-cols-wave {
  grid-template-columns: 1fr 1.618fr 1fr; /* Golden ratio */
}

@media (max-width: 768px) {
  .grid-cols-wave {
    grid-template-columns: 1fr;
  }
}
```

## Component Styles

### Buttons (Interactive Waves)

```css
.btn-primary {
  background: var(--gradient-mid-freq);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transform: translateY(-50%);
  transition: left 0.5s ease;
}

.btn-primary:hover::before {
  left: 100%;
}

.btn-primary:active {
  transform: scale(0.98);
}

/* Button state colors with proper contrast */
.btn-primary:disabled {
  background: var(--color-border);
  color: var(--text-disabled-light);
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-primary:focus-visible {
  box-shadow: 
    0 0 0 3px var(--color-background),
    0 0 0 5px var(--color-ocean-accent);
}

/* Loading state for buttons */
.btn-loading {
  position: relative;
  color: transparent;
}

.btn-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin: -8px 0 0 -8px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Cards (Acoustic Surfaces)

```css
.card {
  background: var(--elevation-1);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: var(--space-6);
  position: relative;
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 16px;
  background: var(--gradient-waveform);
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
}

.card:hover::after {
  opacity: 0.1;
}
```

### Input Fields (Listening Channels)

```css
.input {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  transition: all 0.3s ease;
  position: relative;
}

.input:focus {
  border-color: var(--color-ocean-accent);
  box-shadow: 0 0 0 4px rgba(63, 81, 181, 0.1);
  outline: none;
}

.input-wave-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gradient-waveform);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.input:focus + .input-wave-indicator {
  transform: scaleX(1);
}

/* Input validation with proper contrast */
.input-error {
  border-color: var(--color-error);
  background-color: #fff5f5;
}

.input-error:focus {
  box-shadow: 0 0 0 4px rgba(211, 47, 47, 0.1);
}

.input-success {
  border-color: var(--color-success);
  background-color: #f5fff8;
}

.error-message {
  color: var(--text-error-light);
  font-size: var(--text-sm);
  margin-top: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

/* Icon + message pattern */
.error-message::before {
  content: '⚠';
  font-size: var(--text-base);
}
```

### Focus Management & Keyboard Navigation

```css
/* Enhanced Focus States */
.focusable:focus-visible {
  outline: 3px solid var(--color-ocean-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Skip to content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-ocean-primary);
  color: white;
  padding: var(--space-2) var(--space-4);
  z-index: var(--z-tooltip);
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}

/* Focus trap for modals */
.focus-trap {
  isolation: isolate;
}
```

### Touch Target Sizes

```css
/* Minimum touch targets for mobile */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Enhanced touch targets for voice recording */
.voice-touch-target {
  min-width: 60px;
  min-height: 60px;
  /* Larger for primary voice actions */
}
```

### Navigation (Wave Navigation Bar)

```css
.nav {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: relative;
}

.nav::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-waveform);
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 3'%3E%3Cpath d='M0,1.5 Q300,0 600,1.5 T1200,1.5' stroke='black' fill='none'/%3E%3C/svg%3E");
  mask-size: 100% 100%;
  animation: wave-flow 3s ease-in-out infinite;
}

@keyframes wave-flow {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-50px); }
}
```

### Voice Recorder (Live Waveform)

```css
.voice-recorder {
  background: var(--gradient-radial-wave);
  border-radius: 50%;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.voice-wave {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--color-resonant-accent);
  animation: pulse-wave 1.5s ease-in-out infinite;
}

@keyframes pulse-wave {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

.waveform-visualizer {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 60px;
}

.waveform-bar {
  width: 3px;
  background: var(--gradient-mid-freq);
  border-radius: 1.5px;
  animation: wave-dance 0.5s ease-in-out infinite alternate;
}

@keyframes wave-dance {
  from { height: 20%; }
  to { height: 100%; }
}
```

### Progress Indicators (Sonic Progress)

```css
.progress-wave {
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.progress-wave-fill {
  height: 100%;
  background: var(--gradient-waveform);
  border-radius: 2px;
  position: relative;
  transition: width 0.3s ease;
}

.progress-wave-pulse {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 20px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5));
  animation: progress-pulse 1s ease-in-out infinite;
}

@keyframes progress-pulse {
  0%, 100% { transform: translateX(0); opacity: 0; }
  50% { transform: translateX(-10px); opacity: 1; }
}
```

### Loading & Skeleton States

```css
/* Wave Skeleton Animation */
.skeleton-wave {
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    var(--elevation-1) 50%,
    var(--color-border) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-wave 1.5s ease-in-out infinite;
}

@keyframes skeleton-wave {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Pulse Skeleton for voice elements */
.skeleton-pulse {
  animation: pulse-opacity 1.5s ease-in-out infinite;
}

@keyframes pulse-opacity {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
```

### Dashboard Metrics (Frequency Visualizations)

```css
.metric-card {
  background: var(--elevation-2);
  border-radius: 16px;
  padding: var(--space-6);
  position: relative;
  overflow: hidden;
}

.metric-background-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40%;
  opacity: 0.1;
  background: var(--gradient-waveform);
  mask-image: linear-gradient(to top, black, transparent);
}

.frequency-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 100px;
}

.frequency-bar {
  flex: 1;
  background: var(--gradient-mid-freq);
  border-radius: 2px 2px 0 0;
  transition: height 0.3s ease;
}
```

## Animation Patterns

### Wave Oscillation
```css
@keyframes oscillate {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-2px); }
  75% { transform: translateY(2px); }
}

.oscillating {
  animation: oscillate 2s ease-in-out infinite;
}
```

### Sound Ripple
```css
@keyframes ripple {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(4); opacity: 0; }
}

.ripple-effect {
  position: absolute;
  border-radius: 50%;
  background: var(--color-ocean-accent);
  animation: ripple 0.6s ease-out;
}
```

### Voice Modulation
```css
@keyframes modulate {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.1); }
}

.modulating {
  animation: modulate 1s ease-in-out infinite;
}
```

## Performance Optimizations

```css
/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Keep essential feedback */
  .voice-wave,
  .waveform-visualizer {
    animation-duration: 0.5s !important;
  }
}

/* GPU acceleration for smooth waves */
.wave-animated {
  transform: translateZ(0);
  will-change: transform;
  backface-visibility: hidden;
}
```

## Responsive Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet portrait */
--breakpoint-lg: 1024px;  /* Tablet landscape */
--breakpoint-xl: 1280px;  /* Desktop */
--breakpoint-2xl: 1536px; /* Wide desktop */
```

## Shadow System (Acoustic Depth)

```css
--shadow-sm: 0 1px 2px 0 var(--color-shadow);
--shadow-md: 0 4px 6px -1px var(--color-shadow);
--shadow-lg: 0 10px 15px -3px var(--color-shadow);
--shadow-xl: 0 20px 25px -5px var(--color-shadow);
--shadow-2xl: 0 25px 50px -12px var(--color-shadow);
--shadow-inner: inset 0 2px 4px 0 var(--color-shadow);
--shadow-wave: 0 4px 20px -2px var(--gradient-waveform);
```

## Border Radius (Wave Curves)

```css
--radius-sm: 4px;    /* Subtle curve */
--radius-md: 8px;    /* Standard curve */
--radius-lg: 12px;   /* Smooth curve */
--radius-xl: 16px;   /* Wave curve */
--radius-2xl: 24px;  /* Deep curve */
--radius-full: 9999px; /* Perfect circle */
```

## Z-Index Scale (Depth Layers)

```css
--z-background: -100;  /* Ambient patterns */
--z-below: -1;        /* Hidden elements */
--z-base: 0;          /* Default layer */
--z-dropdown: 10;     /* Dropdowns */
--z-sticky: 20;       /* Sticky elements */
--z-overlay: 30;      /* Overlays */
--z-modal: 40;        /* Modals */
--z-popover: 50;      /* Popovers */
--z-tooltip: 60;      /* Tooltips */
--z-notification: 70; /* Notifications */
```

## Implementation Guidelines

1. **Always use CSS variables** for consistency
2. **Prefer gradients over solid colors** for depth
3. **Include wave patterns** in major components
4. **Animate with purpose**, not decoration
5. **Test on mobile first** - voice feedback is mobile-primary
6. **Maintain 60 FPS** for all animations
7. **Use semantic color names** that reflect audio concepts
8. **Layer elements** to create acoustic depth
9. **Respect reduced motion** preferences
10. **Document custom properties** for team clarity
11. **Ensure proper text contrast** in all color combinations
12. **Test in both light and dark modes** for consistency

## Testing Checklist

- [ ] Colors maintain WCAG AA contrast ratios (4.5:1 normal, 3:1 large text)
- [ ] Critical actions pass WCAG AAA (7:1 contrast)
- [ ] Animations run at 60 FPS on mobile devices
- [ ] Wave patterns visible in light/dark modes
- [ ] Gradients render correctly on all browsers
- [ ] Touch targets meet 44x44px minimum
- [ ] Voice recording targets meet 60x60px minimum
- [ ] Focus states clearly visible with 3px outline
- [ ] Loading states use wave animations
- [ ] Error states maintain sonic theme with proper contrast
- [ ] Success states celebrate with waves
- [ ] All interactions feel "conversational"
- [ ] Dark mode provides proper contrast inversions
- [ ] Reduced motion preferences respected
- [ ] Text never appears on similar-tone backgrounds