# URL Short Backend Reference

## Backend Shape

- Express API runs from `src/index.ts` and mounts URL routes at `/api/url` and auth routes at `/api/auth`.
- CORS is currently open with `app.use(cors())`.
- Responses use JSON errors with a `message` field through `errorHandler`.
- Auth uses bearer tokens in the `Authorization: Bearer <token>` header.

## Auth Endpoints

- `POST /api/auth/register`
  - Body: `{ userName, password, confirmPassword }`
  - Username: 2-30 chars, letters, numbers, underscores.
  - Password: 5-100 chars.
  - Returns: `{ message, token, user: { id, userName } }`

- `POST /api/auth/login`
  - Body: `{ userName, password }`
  - Returns: `{ message, token, user: { id, userName } }`

- `GET /api/auth/me`
  - Requires bearer token.
  - Returns: `{ user: { id, userName } }`
  - Use this on frontend refresh to keep users logged in.

## URL Endpoints

- `POST /api/url/short`
  - Auth is optional. Guests can create links.
  - Body: `{ url, customAlias?, expiresAt?, password?, clickLimit? }`
  - `url` must be a valid `http` or `https` URL.
  - `customAlias` must be 3-30 chars with letters, numbers, dash, or underscore.
  - Reserved aliases include `api`, `login`, `register`, `short`, `delete`, `health`, `stats`, and `admin`.
  - `expiresAt` must be ISO datetime if sent.
  - `clickLimit` must be a positive integer if sent.
  - Returns: `{ shortCode }`

- `GET /api/url/my-links`
  - Requires bearer token.
  - Returns: `{ links }` for the logged-in user.

- `GET /api/url/stats`
  - Public endpoint.
  - Returns: `{ totalLinks, totalClicks }` across non-deleted links.
  - Used by the homepage platform counters.

- `PUT /api/url/claim`
  - Requires bearer token.
  - Body: `{ shortCodes: string[] }`.
  - Attaches unowned non-deleted links to the logged-in user.
  - Used after login/register to bring guest-created links into the dashboard.

- `GET /api/url/details/:shortCode`
  - Requires bearer token and link ownership.
  - Returns: `{ link }`.

- `PUT /api/url/:shortCode`
  - Requires bearer token and link ownership.
  - Body can include `{ url, password, clickLimit, status }`.

- `PUT /api/url/delete/:id`
  - Requires bearer token and link ownership.
  - Soft deletes the link.

- `GET /api/url/:shortCode`
  - Redirects to the original URL.
  - Password-protected links require `x-link-password`.

## Frontend Goals

- Use axios for API calls.
- Store token in `localStorage`.
- Restore auth state with `/api/auth/me` on refresh.
- Home page must allow guest link creation without login.
- Login and register should be modals, not separate required pages.
- Dashboard should only be visible to logged-in users.
- Keep backend unchanged unless frontend cannot work without a backend fix.
