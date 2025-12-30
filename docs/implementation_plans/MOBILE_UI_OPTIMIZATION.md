# Mobile UI Optimization Plan

## Status
- [x] Analysis complete
- [x] Implementation started
- [x] Testing (Linting passed)
- [x] Completed

## Goals
Optimize the mobile user interface to address overcrowding, small spacing, and layout issues, specifically in the WorkTracker and general card views.

## 1. Box Spacing (CardGrid)
**Problem**: Boxes stick together, margins are too small.
**Solution**:
- Update `frontend/src/components/shared/CardGrid.tsx`.
- Changed default gap from `gap-0.5` to `gap-4` (via `space-y-4` logic for flex-col) for better vertical separation on mobile.

## 2. WorkTracker Header Layout
**Problem**: Tabs, search, and buttons are crammed into one row/area, looking messy.
**Solution**:
- Refactored `frontend/src/pages/Worktracker.tsx`.
- Moved the Tabs navigation (To Do's, Reservations, etc.) to a new row *above* the Search/Filter/View controls.
- Matched the layout style of `Organisation.tsx`.

## 3. WorktimeTracker (Zeiterfassung)
**Problem**: Box is too small, scrollbar appears, not modern.
**Solution**:
- Implemented a "Bottom Sheet" pattern for mobile in `frontend/src/components/WorktimeTracker.tsx`.
- **Mobile Behavior**:
  - Fixed at the bottom of the viewport.
  - "Collapsed" state: Shows only status (running/stopped) and time. Height ~48px.
  - "Expanded" state: Slides up to show full controls.
  - Toggle via "Handle" or click.
- **Desktop Behavior**: Kept existing behavior (embedded box).

## 4. Filter Tags
**Problem**: Tags are too small, cut off vertically (top/bottom), scrollbars visible.
**Solution**:
- Updated `frontend/src/components/SavedFilterTags.tsx`.
- Added `py-2` and `min-h-[50px]` to container.
- Added scrollbar styling.

## Steps
1.  [x] **CardGrid**: Increase gap/spacing.
2.  [x] **FilterTags**: Fix CSS for container height and padding.
3.  [x] **WorkTracker**: Rearrange Header (Tabs row).
4.  [x] **WorktimeTracker**: Implement Bottom Sheet logic and styles.
