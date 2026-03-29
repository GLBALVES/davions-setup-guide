

## Fix: Hide scrollbar on email tab carousel

**Problem**: The tab carousel in `AdminEmailManager.tsx` uses `scrollbar-hide` class which doesn't exist in the project. The project defines `no-scrollbar` in `index.css`.

**Fix**: Replace `scrollbar-hide` with `no-scrollbar` on line 1377 of `AdminEmailManager.tsx`.

