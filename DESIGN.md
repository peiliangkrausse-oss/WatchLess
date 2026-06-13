# WatchLess Design Blueprint

This file documents the app's visual design, fonts, layout, UI structure, and interaction language. It is intended to let another designer, engineer, or LLM recreate the product interface if the implementation is lost.

## Design Intent

The app should feel like a polished local desktop tool: focused, dark, calm, slightly premium, and efficient. It is not a marketing page. The first screen is the working app.

Core feelings:

- Local and private.
- Dense but readable.
- Warm dark UI rather than cold blue SaaS.
- Clear setup guidance because LM Studio can confuse non-technical users.
- Desktop-native enough to feel like a utility, but custom enough to feel designed.

## Typography

Primary UI font:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif
```

Display font:

```css
Georgia, "Times New Roman", serif
```

The app intentionally uses local system fonts so the desktop UI has no Google Fonts dependency.

Type usage:

- Sidebar title uses a system serif face, large, high contrast.
- UI labels use uppercase system sans with wide letter spacing.
- Buttons use heavy system sans.
- Summary body uses comfortable long-form reading size and line height.
- Chat uses smaller but still readable text.

Important rule:

- Letter spacing is `0` for most text.
- Uppercase section labels use intentional positive spacing.

## Color System

CSS tokens:

```css
--bg: #0c0c0e;
--surface: #141418;
--surface2: #1c1c22;
--surface3: #24242b;
--border: rgba(255,255,255,.10);
--border-strong: rgba(232,213,176,.24);
--text: #f0ede8;
--muted: #aaa49d;
--muted2: #8d8780;
--accent: #e8d5b0;
--accent2: #d8b978;
--danger: #ff9a9a;
--shadow: 0 24px 70px rgba(0,0,0,.48);
```

Palette description:

- Background is near-black neutral.
- Surfaces are layered charcoal.
- Accent is warm champagne/gold.
- Errors use soft red.
- Muted text is warm gray, not blue-gray.

Avoid:

- Dominant purple gradients.
- Bright SaaS blue.
- Beige full-page theme.
- Decorative gradient blobs.

## App Layout

Desktop layout:

```css
.layout {
  display: grid;
  grid-template-columns: minmax(21rem, 32vw) .35rem minmax(0, 1fr);
  height: 100vh;
}
```

Regions:

1. Left sidebar.
2. Thin draggable vertical resizer.
3. Main content area.

Main content layout:

- Without chat: one summary panel.
- With chat: summary panel plus right chat panel.

```css
.content.chat-open {
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 28rem);
}
```

Responsive behavior:

- At narrower widths, layout becomes single-column.
- Sidebar moves above content.
- Chat panel stacks below/within content flow.
- Button text in summary header can hide on smaller screens.

## Sidebar Structure

Sidebar order:

1. Brand mark.
2. `Summarize YouTube` title.
3. Tagline.
4. Video URL textarea.
5. Advanced details panel.
6. Summarize Queue button.
7. Status/error display.
8. Setup tip.
9. Feedback email section.
10. Donation section.

The sidebar is scrollable and owns setup/configuration.

### Brand Mark

Shape:

- Rounded square.
- Warm dark gradient.
- Gold play icon SVG.
- Subtle border and inner highlight.

Purpose:

- Gives app identity without requiring a full logo system.

### URL Input

Textarea placeholder:

```text
https://youtube.com/watch?v=...
Paste more links on new lines to queue them.
```

Behavior:

- Accept multiple URLs.
- Frontend extracts unique URLs.
- Each URL becomes a queue job/tab.

### Advanced Panel

Use native `<details>` for expand/collapse.

Contains:

- Model selector.
- LM Studio port field.
- Test Connection button.
- Model status text.
- Load model button.
- Unload model button.
- RAM safety disclaimer.
- Prompt Preset nested details.
- Queue list.

The advanced panel is open by default because LM Studio setup is essential.

## Main Summary Panel

The summary panel is the visual center of the app.

Properties:

- Rounded dark card-like panel.
- Full-height inside content area.
- Header at top.
- Browser-like tabs below header.
- Optional progress track below tabs.
- Scrollable summary body.

Header contains:

- Status dot and active title.
- Guide button.
- Narrate button.
- Chat button.

Summary body contains:

- Floating inline Copy button.
- Empty state.
- Loading card.
- Markdown-rendered summary.
- LM Studio setup guide content.

### Tabs

Tabs mimic desktop browser tabs:

- Rectangular, not pill-shaped.
- Active tab blends into panel.
- Running/queued tabs show gold dot.
- Failed tabs show red dot.
- Saved/history tabs show accent dot.
- Running tabs show bottom progress strip.

Tab types:

- Draft.
- Guide.
- Job.
- History.

### Loading State

Loading summary card includes:

- Video title.
- Percent text.
- Progress bar.
- Status/meta line.

Progress uses real job progress plus eased perceived progress while running.

### Completion Animation

When a summary finishes:

- Panel border flashes warm accent.
- Status dot expands.
- Sweep effect crosses panel.
- Check badge appears briefly.
- Rail and spark effects appear.

Reduced motion:

- Respect `prefers-reduced-motion`.
- Disable detailed animations and keep a simple border highlight.

## Chat Panel

Right-side panel when open.

Structure:

1. Header with title and active summary subtitle.
2. Scrollable message list.
3. Chat form.
4. Attachment buttons.
5. Send button.

Chat style:

- Assistant messages align left.
- User messages align right.
- User messages use warm accent background.
- Thinking message includes animated dot indicator.

Attachment behavior:

- File upload supports readable files only.
- Image upload is disabled until backend support exists.

## Buttons And Controls

Primary button:

- Warm gold gradient.
- Dark text.
- Heavy label.
- Subtle shadow and inner highlight.

Secondary buttons:

- Transparent or low-opacity white background.
- Warm border on accent actions.
- No excessive hover movement.

Icon style:

- Inline SVG currently used.
- Icons are simple line icons.
- Future improvement: consolidate icon source or use a known icon library consistently.

Interactive polish:

- Buttons have click ripple.
- Toasts appear bottom-right.
- Copy feedback email has a small copied animation.
- Donation action has a celebratory temporary overlay.

## Summary Typography

Summary body:

- Large readable base.
- High line-height.
- Warm off-white color.
- Comfortable margins for headings, paragraphs, lists, and blockquotes.

Markdown styling:

- H1/H2/H3 bold white.
- Lists use accent markers.
- Blockquotes have accent left border and warm muted body.
- Code in chat messages has small dark inline backgrounds.

Zoom:

- CSS variable `--summary-zoom`.
- Stored in `localStorage` as `ytSummaryZoom`.
- Bounds: `0.82` to `1.55`.

## Guide Design

Guide content appears as a tab, not a modal.

Structure:

- Hero heading and explanatory paragraphs.
- Step cards.
- Some steps include screenshots.
- Screenshots use contained images inside bordered dark frames.

Guide image assets:

```text
watchless_app/static/images/guide/lm-studio-model-search.png
watchless_app/static/images/guide/lm-studio-local-server.png
watchless_app/static/images/guide/lm-studio-gpt-oss-model.png
watchless_app/static/images/guide/lm-studio-download-models.png
```

## Important CSS Components

- `.layout`
- `.sidebar`
- `.brand-mark`
- `.advanced`
- `.prompt-preset-section`
- `.queue-list`
- `.content`
- `.summary-panel`
- `.summary-header`
- `.chrome-tabbar`
- `.chrome-tab`
- `.progress-track`
- `.summary-body`
- `.summary-loading`
- `.chat-panel`
- `.chat-message`
- `.setup-guide`
- `.toast`
- `.finish-fx`

## Accessibility Notes

Existing strengths:

- Uses real buttons.
- Uses labels for main URL input and port input.
- Supports text selection throughout app.
- Respects reduced motion for summary completion animation.

Needed improvements:

- Add stronger keyboard focus styles.
- Use `aria-selected` and tablist semantics for summary tabs.
- Improve close button label from `x` to a richer accessible label.
- Add live region semantics for queue/status updates.
- Avoid relying only on color for job states.

## Rebuild Visual Checklist

If rebuilding from scratch, verify:

- First screen is the working app, not a landing page.
- Sidebar is left, summary is right.
- Dark warm palette is preserved.
- Summary panel has header, tabs, progress, and scrollable body.
- Advanced panel contains model, port, prompts, and queue.
- Chat panel opens on the right.
- Guide opens as a tab.
- Summary body is readable for long Markdown output.
- UI works on desktop and collapses cleanly under `1150px`.
- No text overlaps buttons or panels.
- Image upload remains disabled until real image support exists.
