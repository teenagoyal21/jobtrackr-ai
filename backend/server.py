"""
JobTrackr AI — AI Job Application Command Centre
Built on Lemma SDK (datastores + agents) for the Gappy AI National Hackathon.

ARCHITECTURE
------------
Lemma pod holds:
  - Table "applications": every job applied to (company, role, status, dates, source, JD text)
  - Table "tasks": follow-ups / reminders generated for each application
  - Agent "jd_parser": reads a pasted job description, extracts structured requirements
                        and resume-gap suggestions
  - Agent "followup_drafter": drafts a recruiter follow-up message given an application record

FastAPI is just the thin HTTP layer the React frontend talks to. All persistence and
the actual "AI does the work" logic lives in Lemma (tables + agents), not in this file —
that's what satisfies "use Lemma SDK as the infrastructure layer."

SETUP REQUIRED BEFORE RUNNING
------------------------------
1. `lemma pod create jobtrackr-ai` (or use an existing pod)
2. Set environment variables in backend/.env:
     LEMMA_TOKEN=<your token from lemma.work pod settings>
     LEMMA_ORG_ID=<your org id>
     LEMMA_POD_ID=<your pod id>
3. Run `python bootstrap_lemma.py` once to create the tables + agents in your pod
   (see bootstrap_lemma.py in this folder)
4. `pip install -r requirements.txt`
5. `uvicorn server:app --reload`
"""

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timezone
import os
import logging

from lemma_sdk import Lemma

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jobtrackr")

# ---------------------------------------------------------------------------
# Lemma client — single shared client against your pod
# ---------------------------------------------------------------------------
lemma = Lemma(
    org_id=os.environ.get("LEMMA_ORG_ID"),
    pod_id=os.environ.get("LEMMA_POD_ID"),
    token=os.environ.get("LEMMA_TOKEN"),
)
pod = lemma.pod()  # bound to default_pod_id from settings

APPLICATIONS_TABLE = "applications"
TASKS_TABLE = "tasks"
JD_PARSER_AGENT = "jd_parser"
FOLLOWUP_AGENT = "followup_drafter"

app = FastAPI(title="JobTrackr AI")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas (API layer only — actual storage schema lives in the Lemma table def)
# ---------------------------------------------------------------------------
class ApplicationCreate(BaseModel):
    company: str
    role: str
    source: str = "manual"          # portal / referral / linkedin / email
    job_description: Optional[str] = None
    status: str = "applied"         # applied / interview / offer / rejected
    applied_on: Optional[str] = None


class ApplicationOut(BaseModel):
    id: str
    company: str
    role: str
    source: str
    status: str
    applied_on: Optional[str] = None
    jd_summary: Optional[str] = None
    resume_gaps: Optional[str] = None


class FollowupRequest(BaseModel):
    application_id: str
    tone: str = "polite"  # polite / direct / warm


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "JobTrackr AI — powered by Lemma SDK"}


@api_router.post("/applications", response_model=ApplicationOut)
async def create_application(payload: ApplicationCreate):
    """
    Creates an application row in the Lemma 'applications' table.
    If a job description is provided, runs it through the jd_parser agent
    to extract a structured summary + resume gap suggestions, and stores
    those back onto the same record.
    """
    applied_on = payload.applied_on or datetime.now(timezone.utc).isoformat()

    record = pod.records.create(
        APPLICATIONS_TABLE,
        {
            "company": payload.company,
            "role": payload.role,
            "source": payload.source,
            "status": payload.status,
            "applied_on": applied_on,
            "job_description": payload.job_description or "",
            "jd_summary": "",
            "resume_gaps": "",
        },
    )

    jd_summary = ""
    resume_gaps = ""

    if payload.job_description:
        try:
            conversation = pod.agents.run(
                JD_PARSER_AGENT,
                f"Job description for {payload.role} at {payload.company}:\n\n"
                f"{payload.job_description}\n\n"
                f"Return: (1) a 3-bullet summary of core requirements, "
                f"(2) 2-3 likely resume gaps a typical applicant should address.",
            )
            messages = pod.conversations.messages(str(conversation.id)).items
            reply_text = messages[-1].text if messages else ""

            # naive split — agent is prompted to separate the two sections
            if "Resume gap" in reply_text or "resume gap" in reply_text:
                parts = reply_text.split("gap", 1)
                jd_summary = parts[0].strip()
                resume_gaps = ("gap" + parts[1]).strip() if len(parts) > 1 else ""
            else:
                jd_summary = reply_text.strip()

            pod.records.update(
                APPLICATIONS_TABLE,
                record["id"],
                {"jd_summary": jd_summary, "resume_gaps": resume_gaps},
            )
        except Exception as e:
            logger.warning(f"jd_parser agent failed, continuing without summary: {e}")

    return ApplicationOut(
        id=record["id"],
        company=payload.company,
        role=payload.role,
        source=payload.source,
        status=payload.status,
        applied_on=applied_on,
        jd_summary=jd_summary,
        resume_gaps=resume_gaps,
    )


@api_router.get("/applications", response_model=List[ApplicationOut])
async def list_applications():
    rows = [r.to_dict() for r in pod.records.list(APPLICATIONS_TABLE).items]
    return [
        ApplicationOut(
            id=r["id"],
            company=r.get("company", ""),
            role=r.get("role", ""),
            source=r.get("source", ""),
            status=r.get("status", "applied"),
            applied_on=r.get("applied_on"),
            jd_summary=r.get("jd_summary"),
            resume_gaps=r.get("resume_gaps"),
        )
        for r in rows
    ]


@api_router.patch("/applications/{application_id}/status")
async def update_status(application_id: str, status: str):
    if status not in {"applied", "interview", "offer", "rejected"}:
        raise HTTPException(400, "invalid status")
    pod.records.update(APPLICATIONS_TABLE, application_id, {"status": status})
    return {"id": application_id, "status": status}


@api_router.post("/followup")
async def draft_followup(payload: FollowupRequest):
    """
    Runs the followup_drafter agent on a specific application record to produce
    a ready-to-send recruiter follow-up message. This is the "agent does real work"
    part of the loop — not a generic chatbot, it acts on a specific tracked record.
    """
    record = pod.records.get(APPLICATIONS_TABLE, payload.application_id)
    if not record:
        raise HTTPException(404, "application not found")

    conversation = pod.agents.run(
        FOLLOWUP_AGENT,
        f"Draft a {payload.tone} follow-up email for a job application.\n"
        f"Company: {record.get('company')}\n"
        f"Role: {record.get('role')}\n"
        f"Applied on: {record.get('applied_on')}\n"
        f"Current status: {record.get('status')}\n"
        f"Keep it under 120 words, no generic filler.",
    )
    messages = pod.conversations.messages(str(conversation.id)).items
    draft = messages[-1].text if messages else ""

    # log it as a task so it shows up in the execution board
    pod.records.create(
        TASKS_TABLE,
        {
            "application_id": payload.application_id,
            "type": "followup_drafted",
            "content": draft,
            "logged_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {"application_id": payload.application_id, "draft": draft}


@api_router.get("/tasks")
async def list_tasks():
    return [t.to_dict() for t in pod.records.list(TASKS_TABLE).items]


app.include_router(api_router)
