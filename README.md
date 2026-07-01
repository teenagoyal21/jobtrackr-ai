# JobTrackr AI — AI Job Application Command Centre

Built for the Gappy AI National Hackathon. Repurposed from an earlier A/B-testing
SaaS shell (INFER) into the **AI Job Application Command Centre** problem
statement, rebuilt on **Lemma SDK** as the infrastructure layer.

## What changed from the original INFER project

- Removed MongoDB/Motor — all persistence now goes through Lemma's `pod.tables`
  and `pod.records` (typed, pod-owned data instead of a raw Mongo collection).
- Removed the A/B-testing domain logic (ATE, CUPED, SRM cards) entirely.
- Added two Lemma **agents** (`jd_parser`, `followup_drafter`) that do the
  actual work — this is the "agentic" part the hackathon requires, not a
  static chatbot.
- Kept the frontend's design system (Card, Button, Badge, EmptyState, Sidebar,
  Topbar) since it was solid — reskinned the copy and pages for job tracking.

## How the Lemma SDK is used (this is the part judges check)

| Lemma primitive | Used for |
|---|---|
| `pod.tables.create` | Defines `applications` and `tasks` tables (run once via `bootstrap_lemma.py`) |
| `pod.records.create/list/update` | CRUD for tracked applications and the follow-up log |
| `pod.agents.run` | Runs `jd_parser` on a pasted JD, and `followup_drafter` on a specific tracked application |
| `pod.conversations.messages` | Reads the agent's structured reply back into the app |

This satisfies the "best fit" guidance in the hackathon brief — it manages a
real workflow (job applications) with state that persists, not a stateless
chatbot or static page.

## Setup

### 1. Lemma pod
```bash
uv tool install lemma-terminal
lemma servers select cloud
lemma auth login
lemma pod create jobtrackr-ai
lemma pod info jobtrackr-ai   # copy org_id, pod_id, token
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in LEMMA_ORG_ID, LEMMA_POD_ID, LEMMA_TOKEN
pip install -r requirements.txt
python bootstrap_lemma.py   # creates tables + agents in your pod, run once
uvicorn server:app --reload
```

### 3. Frontend
```bash
cd frontend
yarn install   # or npm install
yarn start     # or npm start
```
Set `REACT_APP_API_URL` if your backend isn't on `localhost:8000/api`.

## Demo flow for your screen recording

1. Add an application with a pasted JD → watch `jd_parser` agent return a
   requirements summary + resume gaps inline on the card.
2. Change status (Applied → Interview) on the dropdown — updates the Lemma
   record live.
3. Click "Draft follow-up" → `followup_drafter` agent writes a ready-to-send
   email referencing the specific company/role/date, logged to the `tasks`
   table.

That loop — parse → track → act — is the "core loop works end-to-end"
the judging criteria asks for.

## Known limitations / what's stubbed

- No auth layer yet (single shared pod, fine for a hackathon demo).
- The JD summary / resume-gap split in `server.py` is a naive string split on
  the word "gap" — works because the agent is prompted to label that section,
  but tighten this if agent phrasing varies (e.g. ask for JSON output instead).
- Tasks page (`view === "tasks"`) is wired in the sidebar but not yet built
  out as a separate view — currently follow-up drafts just surface inline on
  the dashboard. Quick addition if you have time before submission.
