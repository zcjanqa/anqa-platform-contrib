# NO LONGER TODO - Migration has been Completed !

## App Router Migration TODO (Steps 1–4)

Goal: Migrate recent Pages Router work into the restored App Router skeleton safely and incrementally.

### 1) Add the navbar to the App Router layout
- [x] Edit `apps/frontend/src/app/layout.tsx` to render the shared navbar on all routes.
  - Add import:
```tsx
import NavBar from "../components/NavBar";
```
  - Wrap body children:
```tsx
<body className="min-h-screen bg-gray-50 text-gray-900">
  <NavBar />
  {children}
  {/* consider a global footer later */}
  {/* <SiteFooter /> */}
</body>
```

- [x] Update `apps/frontend/src/components/NavBar.tsx` to App Router navigation APIs.
  - Replace:
```tsx
import { useRouter } from 'next/router'
const router = useRouter()
useEffect(() => { setMenuOpen(false) }, [router.asPath])
```
  - With:
```tsx
import { usePathname } from 'next/navigation'
const pathname = usePathname()
useEffect(() => { setMenuOpen(false) }, [pathname])
```

Review (Step 1):
- Implemented `NavBar` in `app/layout.tsx` and migrated `NavBar.tsx` to `usePathname` from `next/navigation`. Verified menu auto-closes on route change via pathname effect.

Notes:
- Keep `'use client'` at the top of `NavBar.tsx`.
- No `dynamic(..., { ssr: false })` needed in App Router; `NavBar` is a client component and will be rendered from `layout.tsx`.

### 2) Global styles (App Router source of truth)
- [x] Keep `apps/frontend/src/app/globals.css` as the single global stylesheet.
- [x] Remove references to `pages/_app.tsx` and `pages/_document.tsx` (not used by App Router). Do not delete yet if still verifying; just ignore during App Router dev.

Checklist:
- [x] Confirm `layout.tsx` imports `"./globals.css"`.
- [x] Ensure tailwind directives exist in `src/app/globals.css`.

Review (Step 2):
- Confirmed `app/layout.tsx` imports `./globals.css`; `src/app/globals.css` contains Tailwind directives. Pages router globals are ignored by the App Router.

### 3) Create App Router counterparts for Pages routes
Create new app routes and copy page contents, adjusting imports and client directives.

- [x] `apps/frontend/src/app/about/page.tsx` ← copy from `src/pages/about.tsx`
- [x] `apps/frontend/src/app/login/page.tsx` ← copy from `src/pages/login.tsx`
- [x] `apps/frontend/src/app/signup/page.tsx` ← copy from `src/pages/signup.tsx`
- [x] `apps/frontend/src/app/profile/page.tsx` ← copy from `src/pages/profile.tsx`
- [x] `apps/frontend/src/app/screening/page.tsx` ← copy from `src/pages/screening.tsx`
- [x] `apps/frontend/src/app/auth/callback/page.tsx` ← copy from `src/pages/auth/callback.tsx`
- [x] `apps/frontend/src/app/auth/set-password/page.tsx` ← copy from `src/pages/auth/set-password.tsx`
- [x] `apps/frontend/src/app/auth/confirmed/page.tsx` ← copy from `src/pages/auth/confirmed.tsx`

Import path adjustments:
- For routes under `app/*/page.tsx`, use blueprint:
```tsx
import { ... } from "../../components/blueprint"
```
- For routes under `app/auth/*/page.tsx`, use:
```tsx
import { ... } from "../../../components/blueprint"
```
- Keep `'use client'` on files that use state/effects or browser APIs.

### 4) Auth page specifics (App Router APIs)
- [x] In `app/auth/callback/page.tsx` and `app/auth/set-password/page.tsx`:
  - Replace `next/router` with `next/navigation` for navigation.
  - Example:
```tsx
import { useRouter } from 'next/navigation'
// router.replace('/login') still works the same
```
- [x] In `app/auth/confirmed/page.tsx` adjust blueprint import path only.

Review (Steps 3–4):
- Created App Router pages for about, login, signup, profile, screening, and all auth pages. Updated imports to point to `../../..../components/blueprint` appropriately and added `'use client'` where needed. Replaced `next/router` with `next/navigation` in auth pages. Lint check passed with no errors.

Optional tidy-ups (after the above works):
- [x] Consider renaming `src/app/surveys/clinican_survey.tsx` → `clinician_survey.tsx` and update `src/app/surveys/clinician/page.tsx` import accordingly.
- [ ] Once all routes are migrated and verified, remove `src/pages/**` (except `pages/api/*` if still used).

### Verification checklist
- [ ] `npm run dev` starts without type or runtime errors.
- [ ] Navbar renders on all app routes; menu auto-closes on navigation.
- [ ] Routes load: `/`, `/about`, `/screening`, `/surveys`, `/surveys/clinician`.
- [ ] Auth flows function: `/login`, `/signup`, `/profile`, `/auth/callback`, `/auth/confirmed`, `/auth/set-password`.

### Rollback note
App and Pages routers can temporarily coexist. If needed, comment out or remove conflicting routes in `pages/` while migrating.













# Original Migration plan MD file

### Step-by-step migration plan (exact actions)

1) Add the navbar to the App Router layout
- Import and render `NavBar` in `src/app/layout.tsx` so it appears on every app route.
- Update `NavBar.tsx` to App Router navigation APIs.

Edits:
- In `src/app/layout.tsx`:
  - Add: `import NavBar from '../components/NavBar'`
  - Wrap body:
    ```
    <body className="min-h-screen bg-gray-50 text-gray-900">
      <NavBar />
      {children}
    </body>
    ```
- In `src/components/NavBar.tsx`, switch to App Router hooks:
  - Replace: `import { useRouter } from 'next/router'`
  - With: `import { usePathname } from 'next/navigation'`
  - Replace: `const router = useRouter()`
  - With: `const pathname = usePathname()`
  - Replace effect:
    ```
    useEffect(() => { setMenuOpen(false) }, [router.asPath])
    ```
    With:
    ```
    useEffect(() => { setMenuOpen(false) }, [pathname])
    ```

2) Global styles
- App Router uses `src/app/globals.css` (already exists and matches your `src/styles/globals.css`). Keep `src/app/globals.css` as the single source. No other change needed now. `_app.tsx` and `_document.tsx` won’t be used by App Router.

3) Create App Router counterparts for Pages Router routes
Create these files and paste the Page content, adjusting imports:

- `src/app/about/page.tsx` ← from `src/pages/about.tsx`
- `src/app/login/page.tsx` ← from `src/pages/login.tsx`
- `src/app/signup/page.tsx` ← from `src/pages/signup.tsx`
- `src/app/profile/page.tsx` ← from `src/pages/profile.tsx`
- `src/app/screening/page.tsx` ← from `src/pages/screening.tsx`
- `src/app/auth/callback/page.tsx` ← from `src/pages/auth/callback.tsx`
- `src/app/auth/set-password/page.tsx` ← from `src/pages/auth/set-password.tsx`
- `src/app/auth/confirmed/page.tsx` ← from `src/pages/auth/confirmed.tsx`

Import path fixes you’ll need when pasting:
- Pages imported the blueprint via `../components/blueprint` (or `../../components/blueprint`).
  - In App Router, from e.g. `src/app/about/page.tsx`, use:
    - `import { ... } from '../../components/blueprint'`
  - From `src/app/auth/*/page.tsx`, use:
    - `import { ... } from '../../../components/blueprint'`
- Any `import { useRouter } from 'next/router'` inside these new app pages must change to App Router hooks:
  - `import { useRouter } from 'next/navigation'` (for `router.push/replace`)
  - If you were only observing path changes, use `usePathname()` instead.
- Ensure client components keep `'use client'` at the top (your auth pages already do).

4) Auth page specifics (App Router adjustments)
- `src/pages/auth/callback.tsx`:
  - Change `import { useRouter } from 'next/router'` → `from 'next/navigation'`.
  - Keep the existing logic; `router.replace('/path')` works the same.
- `src/pages/auth/set-password.tsx`:
  - Same import change to `next/navigation`. Rest is fine.
- `src/pages/auth/confirmed.tsx`:
  - Pure client UI; only adjust the blueprint import path to App Router relative path.

5) Surveys
- Already present:
  - `src/app/surveys/page.tsx`
  - `src/app/surveys/clinician/page.tsx` → renders `../clinican_survey` (spelling).
- Optional cleanup:
  - Consider renaming `src/app/surveys/clinican_survey.tsx` → `clinician_survey.tsx` and updating the import in `src/app/surveys/clinician/page.tsx` to match. Not required for functionality.

6) Run and verify
- Start dev, navigate every route, confirm navbar appears and interactions work: