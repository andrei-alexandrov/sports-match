# Deploying Sports Match

One Render web service runs everything: the Express API, Socket.io
websockets, and the built React app — a single origin, so session cookies
and websockets need no special configuration. Data lives in a free
MongoDB Atlas cluster.

Total cost: $0. Total time: ~15 minutes.

## 1. Create the database (MongoDB Atlas, free M0)

1. Sign up / log in at <https://www.mongodb.com/cloud/atlas>.
2. Create a project, then **Build a Database** → choose the **M0 (Free)**
   tier. Pick a region close to your Render region (e.g. Frankfurt).
3. **Database Access** → *Add New Database User* → password
   authentication, a username and a strong password, role
   **Read and write to any database**.
4. **Network Access** → *Add IP Address* → **Allow access from anywhere
   (0.0.0.0/0)**. Render's free tier has no static outbound IPs, so
   per-IP allowlisting is not possible; the strong DB password is the
   access control.
5. **Clusters** → *Connect* → *Drivers* → copy the connection string:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/…`
6. Put the database name `sports-match` into the path, keeping the query
   string:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/sports-match?retryWrites=true&w=majority`

## 2. Deploy the app (Render, free)

1. Sign up at <https://render.com> (easiest: log in with GitHub).
2. **New** → **Blueprint** → select this repository. Render reads
   `render.yaml` and proposes one free web service.
3. When prompted for environment variables, paste the Atlas connection
   string (step 1.6) into **MONGO_URL**. `SESSION_SECRET` is generated
   automatically; `NODE_ENV` is preset.
4. **Apply**. The first build takes a few minutes: it installs, builds
   shared/server/client, boots, and self-seeds the 54 Sofia venues on
   first connect.

## 3. Verify

- `https://<service>.onrender.com/api/health` → `{"status":"ok"}`
- Open the root URL, register a user, fill in the profile.
- **Places**: filters work and "Near me" asks for location (54 seeded
  venues).
- Open a second browser (or a private window), register another user,
  and chat between the two — messages appear live over websockets.
- **Events**: create one, join/leave it with the second user.

## Known free-tier limits

- Render free instances spin down after ~15 minutes idle; the next
  request takes ~30–60 s while the instance boots. Fine for a demo/beta.
- Rate-limit counters live in process memory and reset on every
  restart/deploy — fine at this scale.
- Atlas M0 caps storage at 512 MB and may pause after long inactivity.

## Local production rehearsal

    npm run build && npm run smoke

Builds everything, then boots the real production bundle against a
throwaway in-memory MongoDB and probes `/api/health`, the SPA shell, and
a JSON 404.

## Configuration reference

| Variable         | Required          | Purpose                                            |
| ---------------- | ----------------- | -------------------------------------------------- |
| `NODE_ENV`       | yes (production)  | Enables secure cookies + SPA serving               |
| `MONGO_URL`      | yes               | Atlas connection string (with `/sports-match` db)  |
| `SESSION_SECRET` | yes (production)  | Session cookie signing key                         |
| `PORT`           | injected by host  | Listen port (defaults to 4000 locally)             |
| `CLIENT_DIST`    | no                | Override the SPA build path (default `client/dist`)|
