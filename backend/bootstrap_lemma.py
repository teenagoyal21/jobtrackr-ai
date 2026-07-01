"""
Run this ONCE after creating your Lemma pod, before starting the FastAPI server.

    python bootstrap_lemma.py

It creates:
  - applications table  (your tracked job applications)
  - tasks table          (follow-ups / agent-generated actions log)
  - jd_parser agent       (reads a JD, returns summary + resume gaps)
  - followup_drafter agent (drafts recruiter follow-up emails)

Safe to re-run — it checks for existing resources first.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from lemma_sdk import Lemma
from lemma_sdk.openapi_client.models import CreateTableRequest, CreateAgentRequest
from lemma_sdk.openapi_client.models.column_schema import ColumnSchema
from lemma_sdk.openapi_client.models.datastore_data_type import DatastoreDataType

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

lemma = Lemma(
    org_id=os.environ.get("LEMMA_ORG_ID"),
    pod_id=os.environ.get("LEMMA_POD_ID"),
    token=os.environ.get("LEMMA_TOKEN"),
)
pod = lemma.pod()


def text_column(name: str, required: bool = False) -> ColumnSchema:
    return ColumnSchema(name=name, type_=DatastoreDataType.TEXT, required=required)


def ensure_table(name: str, columns: list[ColumnSchema], primary_key: str = "id"):
    existing = {t.name for t in pod.tables.list().items}
    if name in existing:
        print(f"[skip] table '{name}' already exists")
        return
    pod.tables.create(
        CreateTableRequest(
            name=name,
            columns=columns,
            primary_key_column=primary_key,
            enable_rls=False,  # shared table — everyone on the pod can read/write
        )
    )
    print(f"[ok] created table '{name}'")


def ensure_agent(name: str, instructions: str):
    existing = {a.name for a in pod.agents.list().items}
    if name in existing:
        print(f"[skip] agent '{name}' already exists")
        return
    pod.agents.create(
        CreateAgentRequest(
            name=name,
            instruction=instructions,
        )
    )
    print(f"[ok] created agent '{name}'")


if __name__ == "__main__":
    ensure_table(
        "applications",
        columns=[
            text_column("company", required=True),
            text_column("role", required=True),
            text_column("source"),
            text_column("status"),
            text_column("applied_on"),
            text_column("job_description"),
            text_column("jd_summary"),
            text_column("resume_gaps"),
        ],
    )

    ensure_table(
        "tasks",
        columns=[
            text_column("application_id", required=True),
            text_column("type"),
            text_column("content"),
            text_column("logged_at"),
        ],
    )

    ensure_agent(
        "jd_parser",
        instructions=(
            "You read job descriptions and extract: (1) a concise 3-bullet summary "
            "of the core requirements, and (2) 2-3 likely resume gaps a typical "
            "applicant should address before applying. Be specific and skip filler. "
            "Always label the second section starting with the word 'Resume gaps:'."
        ),
    )

    ensure_agent(
        "followup_drafter",
        instructions=(
            "You draft short, specific follow-up emails to recruiters about a "
            "tracked job application. Use the company, role, and applied date "
            "given to you. Keep messages under 120 words, no generic filler, "
            "no placeholder brackets — write it ready to send."
        ),
    )

    print("\nBootstrap complete. Your pod is ready — start the server with:")
    print("  uvicorn server:app --reload")
