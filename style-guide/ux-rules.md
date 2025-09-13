# UX Rules: Voice as Visual Currency

## Core Philosophy
Transform the invisible act of speaking into tangible, valuable visual experiences that communicate trust, progress, and insight.

## Fundamental Principles

### 1. The Listening State
Every interface should visually "breathe" - showing it's alive and ready to receive input.

#### Implementation Rules:
- **Idle Breathing**: Elements pulse at 60-72 BPM (resting heart rate) when awaiting input
- **Active Listening**: Visual contraction of 5-10% when user begins interaction
- **Response Expansion**: Elements expand 10-15% when providing feedback
- **Wave Propagation**: Actions create ripple effects that flow outward at 300ms intervals

### 2. Depth as Value Hierarchy

#### Z-Axis Layers:
1. **Background Layer** (-100z): Ambient wave patterns, subtle movement
2. **Context Layer** (-50z): Business information, static content
3. **Interaction Layer** (0z): Primary user interface elements
4. **Feedback Layer** (50z): Live waveforms, active responses
5. **Reward Layer** (100z): Payment confirmations, success states

#### Shadow & Elevation Rules:
- Resting: `box-shadow: 0 2px 4px rgba(26,35,126,0.1)`
- Hover: `box-shadow: 0 4px 8px rgba(26,35,126,0.15)`
- Active: `box-shadow: 0 8px 16px rgba(26,35,126,0.2)`
- Elevated: `box-shadow: 0 16px 32px rgba(26,35,126,0.25)`

### 3. Progress Through Sound Visualization

#### Waveform Progress Indicators:
- **Linear Progress**: Waveform that builds left-to-right as task completes
- **Circular Progress**: Sound wave that spirals outward from center
- **Step Progress**: Frequency bars that fill sequentially
- **Quality Score**: Amplitude visualization that grows with score value

#### Timing Standards:
- Micro-interactions: 150-300ms
- State transitions: 300-500ms
- Page transitions: 500-800ms
- Complex animations: 800-1200ms

### 4. Conversational Flow Patterns

#### Interaction Sequence:
1. **Invitation** (0ms): Element subtly pulses to invite interaction
2. **Acknowledgment** (150ms): Visual feedback confirms user input
3. **Processing** (300ms): Waveform animation shows active listening
4. **Response** (500ms): Smooth expansion with result
5. **Settlement** (800ms): Gentle return to resting state

#### Voice Interaction States:
- **Pre-Recording**: Gentle oscillation at 0.5Hz
- **Recording Active**: Live waveform visualization synced to audio input
- **Processing**: Compressed waveform pulsing at 2Hz
- **AI Responding**: Waveform expanding outward from center
- **Complete**: Waveform settles into quality score visualization

### 5. Wave-Form Architecture

#### Navigation Patterns:
- **Wave Navigation**: Nav items connected by flowing wave baseline
- **Active State**: Selected item creates peak in wave pattern
- **Hover State**: Localized wave disturbance around cursor
- **Transition**: Wave flows between sections during navigation

#### Data Visualization:
- **Feedback Metrics**: Display as frequency spectrum analyzer
- **Time Series**: Show as continuous waveform with amplitude = value
- **Categories**: Represent as different frequency bands
- **Sentiment**: Visualize as wave harmony/dissonance

### 6. Professional Restraint

#### Animation Constraints:
- **No Bouncing**: Use ease-out curves exclusively
- **No Spinning**: Rotations limited to 180° max
- **No Flashing**: Opacity changes between 0.3-1.0 only
- **No Chaos**: Maximum 3 concurrent animations per viewport

#### Easing Functions:
- Primary: `cubic-bezier(0.4, 0.0, 0.2, 1)` - Material standard
- Emphasis: `cubic-bezier(0.0, 0.0, 0.2, 1)` - Acceleration
- Settle: `cubic-bezier(0.4, 0.0, 1, 1)` - Deceleration
- Smooth: `cubic-bezier(0.4, 0.0, 0.6, 1)` - Balanced

### 7. Responsive Listening

#### Breakpoint Behaviors:
- **Mobile** (< 768px): Single wave column, vertical flow
- **Tablet** (768-1024px): Dual wave columns, mixed flow
- **Desktop** (> 1024px): Multi-wave layout, horizontal flow

#### Touch Interactions:
- **Tap**: Create ripple at touch point
- **Hold**: Increase wave amplitude progressively
- **Swipe**: Wave follows gesture path
- **Pinch**: Modulate wave frequency

### 8. Feedback as Currency

#### Value Visualization:
- **Low Quality** (0-40): Minimal wave amplitude, muted colors
- **Medium Quality** (40-70): Moderate waves, balanced colors
- **High Quality** (70-100): Full amplitude, vibrant gradients

#### Reward Animation Sequence:
1. Quality score builds as expanding waveform (1s)
2. Score transforms into currency symbol (0.5s)
3. Currency amount counts up with wave pulse (1s)
4. Success wave ripples outward (0.5s)

### 9. Error States as Dissonance

#### Error Handling:
- **Warning**: Wave distortion with amber overlay
- **Error**: Wave fragmentation with red accent
- **Recovery**: Wave reformation to stable pattern

### 10. Accessibility Through Sound

#### Visual Sound Cues:
- **Screen Reader**: Visible wave pattern when active
- **Keyboard Navigation**: Wave follows focus
- **High Contrast**: Maintain wave visibility in all modes
- **Motion Preference**: Respect prefers-reduced-motion

### 11. Content Hierarchy Through Contrast

#### Text Hierarchy Rules:
- **Primary Content**: Always use --text-primary-[light/dark] for main content
- **Secondary Info**: Use --text-secondary-[light/dark] for metadata
- **Interactive Elements**: Must maintain 4.5:1 contrast ratio minimum
- **Disabled States**: Clearly differentiate with reduced opacity AND color change

#### Background Rules:
- **Never place**: Light text on light backgrounds
- **Never place**: Dark text on dark backgrounds  
- **Gradient text**: Only on solid backgrounds, never on gradients
- **Wave overlays**: Maximum 20% opacity to maintain text readability

#### Contrast Testing Requirements:
- All text must pass WCAG AA (4.5:1 for normal, 3:1 for large)
- Critical actions must pass WCAG AAA (7:1)
- Test all color combinations in both light and dark modes
- Verify contrast with wave animations active

## Component-Specific Rules

### Voice Recorder Component
- Microphone icon pulses at speaking rhythm
- Real-time waveform matches actual audio input
- Amplitude indicates volume, frequency shows pitch
- Silent periods show as flat line with gentle oscillation
- Touch target minimum 60x60px for mobile

### Dashboard Analytics
- All metrics displayed as wave-based visualizations
- Hovering reveals wave details tooltip
- Clicking creates wave expansion for drill-down
- Multiple metrics show as layered wave spectrums
- Ensure contrast between overlapping wave layers

### Payment Flow
- Progress shown as building wave crescendo
- Success creates outward rippling celebration
- Amount displays with wave underline animation
- Confirmation includes wave signature pattern
- Error states maintain readability with proper contrast

### Authentication
- Password strength shown as wave complexity
- Login animation as wave synchronization
- Session timeout as wave decay
- Logout as wave dissipation
- Focus states clearly visible during input

### Form Validation
- Success indicators use green wave with checkmark
- Error messages appear with red wave disruption
- Warning states show amber wave oscillation
- Field focus creates localized wave expansion
- Helper text maintains proper contrast ratios

### Loading States
- Skeleton screens use wave-flow animation
- Content loads with wave-reveal pattern
- Lazy loading triggers on wave intersection
- Error recovery shows wave reconstruction
- Always indicate progress visually

## Performance Guidelines

### Animation Performance:
- Use CSS transforms exclusively for wave animations
- Implement `will-change` for anticipated animations
- Limit concurrent animations to maintain 60 FPS
- Use `requestAnimationFrame` for complex wave calculations
- Add `transform: translateZ(0)` for GPU acceleration

### Loading Strategies:
- Show wave skeleton during data fetch
- Progressive wave building for long operations
- Stagger wave animations for list items (50ms intervals)
- Use intersection observer for wave triggers
- Preload critical wave animation keyframes

### Responsive Performance:
- Reduce wave complexity on low-end devices
- Use CSS containment for wave containers
- Implement virtual scrolling for wave lists
- Debounce wave interactions (100ms minimum)
- Cache calculated wave paths

## Testing Criteria

Every interaction must pass the "Listening Test":
1. Does it visually acknowledge user input?
2. Does it show clear progress through wave visualization?
3. Does it communicate value through depth and motion?
4. Does it maintain professional restraint?
5. Does it feel like a conversation, not a transaction?
6. Does it maintain proper contrast in all states?
7. Does it work with keyboard navigation?
8. Does it respect user motion preferences?
9. Does it provide clear focus indicators?
10. Does it work in both light and dark modes?

## Implementation Priority

### Critical (Week 1):
- Voice recording interface with live waveform
- Proper text contrast system
- Focus management and keyboard navigation
- Dark mode support

### High (Week 2):
- Dashboard wave visualizations
- Loading and skeleton states
- Form validation with wave feedback
- Touch target optimization

### Medium (Week 3):
- Navigation wave patterns
- Progress indicators with wave animation
- Payment flow animations
- Error state handling

### Low (Week 4):
- Decorative wave elements
- Advanced wave interactions
- Custom easing functions
- Performance optimizations

## Accessibility Checklist

- [ ] All text meets WCAG AA contrast requirements
- [ ] Focus indicators visible and consistent
- [ ] Touch targets meet minimum size requirements
- [ ] Animations respect reduced-motion preferences
- [ ] Screen reader announcements for wave states
- [ ] Keyboard navigation fully functional
- [ ] Error messages clearly communicated
- [ ] Loading states announced to assistive technology
- [ ] Dark mode maintains proper contrast
- [ ] Wave visualizations have text alternatives

## Dark Mode Considerations

- Invert background colors, not just darken
- Adjust gradient opacity for dark backgrounds
- Increase shadow blur for depth on dark surfaces
- Use lighter wave colors for visibility
- Maintain brand colors but adjust saturation
- Test all states in both light and dark modes
- Ensure focus indicators remain visible
- Adjust overlay opacity for readability

Remember: Every pixel should serve the philosophy of transforming voice into visible value, while maintaining accessibility and usability for all users.  