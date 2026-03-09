
## Understanding the Problem

The user is thinking about the client authentication model for Davions. This is a multi-tenant platform where:
- Multiple photographers each have their own "branded space" (galleries, portfolio)
- The same person (e.g., Maria) could be a client of Photographer A AND Photographer B
- Each photographer may have whitelabel branding

The user is asking me to recommend: **access code (password per gallery)** vs **full account-based authentication**.

## My Analysis

### Option A — Access Code (Password per Gallery)
How it works: Photographer sets a password per gallery → shares link + password → client visits `/g/[slug]` → enters password → sees photos.

Pros:
- Zero friction for clients — no account needed
- Clients can't "accidentally" see another photographer's client data
- Already in the knowledge base as the designed flow
- No multi-tenancy complexity for the client side
- Scales naturally to whitelabel — the slug is already scoped to one photographer

Cons:
- No persistent session across galleries (client must re-enter passwords)
- No client account history (favorites, downloads) across time
- Photographer can't identify WHO viewed the gallery (just that someone did)

### Option B — Full Client Auth (email + password account)
How it works: Client creates an account → account is linked to a photographer → accesses all that photographer's galleries in one login.

Pros:
- Richer experience (favorites history, download history)
- Photographer knows exactly who viewed what

Cons:
- Multi-tenancy nightmare: same email on Photographer A's platform ≠ same email on Photographer B's
- You'd need a `photographer_id` tied to every client account
- Clients would need DIFFERENT accounts per photographer (bad UX)
- OR a global client account tied to multiple photographers (complex)

### Option C — Hybrid (Recommended)
**Best of both worlds:**
- Gallery access uses a **per-gallery access code** (password) — no account required. This handles 90% of client interactions.
- Optionally, a client can create a lightweight account (email + magic link / OTP) **per photographer context** to:
  - Save favorites across sessions
  - See all galleries shared with them by that photographer
  - The client account is scoped to the photographer (`client_id + photographer_id`)

This is how Pixieset and Pic-Time work — gallery password first, optional account for persistence.

## The Plan

Rather than building auth pages yet, this is a **planning/recommendation message**. I should present my recommendation clearly, explain the architecture, and then propose what to build.

### Recommendation: Access Code as primary + Optional lightweight client account (scoped per photographer)

**Data model for client gallery access:**

```
Gallery
  - id
  - photographer_id  ← always scoped to one photographer
  - slug             ← unique URL identifier
  - access_code      ← hashed password/PIN set by photographer
  - client_email     ← optional, who the gallery was sent to

GallerySession (client-side, sessionStorage)
  - gallery_id
  - unlocked_at
  - (no backend auth needed)
```

**For optional client accounts:**
```
User (role: 'client')
  - id, email, name

client_photographer_link
  - client_id (→ User)
  - photographer_id (→ User)
  - invited_at
  (This handles the same client being with multiple photographers)
```

## What to Present

This is a design/architecture recommendation, not just a code plan. I should:
1. Explain the recommendation clearly
2. Show the architecture
3. Ask if they want to proceed with this model before building

Since this is a planning mode message, I present the recommendation as a plan for approval.

The plan should cover:
- Primary: Access Code per gallery (no client account required)
- Secondary: Optional client account, scoped per photographer via a link table
- The URL structure `/g/[slug]` with password entry
- How the multi-tenancy problem is solved naturally (gallery slug is already photographer-scoped)
- What pages/components this implies building

## Files this would touch (when approved)
- `src/pages/GalleryAccess.tsx` (new) — `/g/[slug]` password entry
- `src/App.tsx` — add route
- Database schema (when Supabase is connected): `galleries` table with `access_code`, `photographer_id`

This is still plan mode — no code changes.
