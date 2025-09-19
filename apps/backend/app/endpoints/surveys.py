from fastapi import APIRouter, Request, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Optional, Dict, List
from app.core.auth import get_optional_user, User
from app.core import supabase

router = APIRouter(prefix="/surveys", tags=["surveys"])


class SaveSurveyPayload(BaseModel):
    client_session_id: str
    answers: Dict[str, Any] = {}
    is_autosave: bool = False
    survey_version: Optional[str] = None
    question_catalog: Optional[Dict[str, Dict[str, str]]] = None


@router.post("/clinician")
def save_clinician_survey(
    payload: SaveSurveyPayload,
    request: Request,
    user: Optional[User] = Depends(get_optional_user),
):
    # Extract client IP; consider X-Forwarded-For if behind reverse proxy
    xff = request.headers.get("x-forwarded-for")
    ip = (xff.split(",")[0].strip() if xff else request.client.host) if request.client else None

    try:
        data = {
            "client_session_id": payload.client_session_id,
            "answers": payload.answers,
            "is_autosave": payload.is_autosave,
            "ip_address": ip,
            "auth_user_id": getattr(user, "id", None) if user else None,
        }
        if payload.survey_version:
            data["survey_version"] = payload.survey_version
        if payload.question_catalog:
            data["question_catalog"] = payload.question_catalog
        result = supabase.table("clinician_survey_responses").insert(data).execute()
        inserted = (result.data or [None])[0]
        return {"status": "ok", "id": inserted.get("id") if inserted else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clinician")
def get_latest_clinician_survey(client_session_id: str):
    """Return the most recent saved answers for a client session (autosave or submit)."""
    try:
        result = (
            supabase
            .table("clinician_survey_responses")
            .select("answers,is_autosave,created_at")
            .eq("client_session_id", client_session_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            return {"answers": {}, "is_autosave": True, "created_at": None}
        row = rows[0]
        return {
            "answers": row.get("answers") or {},
            "is_autosave": bool(row.get("is_autosave")),
            "created_at": row.get("created_at"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- New generic survey API using the canonical schema ---

class UpsertSurveyResponsePayload(BaseModel):
    survey_id: str  # format: "{survey_type}:{survey_version}"
    client_session_id: str
    answers: Dict[str, Any] = {}
    is_autosave: bool = False
    answers_text: Optional[Dict[str, Any]] = None
    submit: Optional[bool] = None  # when true, mark as submitted/finalized


@router.get("/definitions")
def get_survey_definitions(
    survey_type: Optional[str] = Query(None),
    version: Optional[str] = Query(None),
    status: str = Query("active"),
):
    try:
        q = supabase.table("surveys").select("id,survey_type,survey_version,title,description,definition,status,updated_at")
        if survey_type:
            q = q.eq("survey_type", survey_type)
        if version:
            q = q.eq("survey_version", version)
        if status:
            q = q.eq("status", status)
        res = q.execute()
        rows: List[Dict[str, Any]] = res.data or []
        if version and survey_type and not rows:
            raise HTTPException(status_code=404, detail="Survey not found")
        return {"surveys": rows}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/definition/{survey_id}")
def get_survey_definition(survey_id: str):
    try:
        res = (
            supabase
            .table("surveys")
            .select("id,survey_type,survey_version,title,description,definition,status,updated_at")
            .eq("id", survey_id)
            .single()
            .execute()
        )
        data = res.data
        if not data:
            raise HTTPException(status_code=404, detail="Survey not found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/responses")
def get_saved_answers(survey_id: str, client_session_id: str):
    """Return the most recent saved answers for survey+session."""
    try:
        result = (
            supabase
            .table("survey_responses")
            .select("answers,is_autosave,updated_at,submitted_at,finalized")
            .eq("survey_id", survey_id)
            .eq("client_session_id", client_session_id)
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            return {"answers": {}, "is_autosave": True, "updated_at": None, "submitted_at": None, "finalized": False, "submitted": False, "allow_restore": True}
        row = rows[0]
        submitted_flag = bool(row.get("finalized")) or bool(row.get("submitted_at"))
        return {
            "answers": row.get("answers") or {},
            "is_autosave": bool(row.get("is_autosave")),
            "updated_at": row.get("updated_at"),
            "submitted_at": row.get("submitted_at"),
            "finalized": bool(row.get("finalized")),
            "submitted": submitted_flag,
            "allow_restore": not submitted_flag,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/responses")
def upsert_survey_response(
    payload: UpsertSurveyResponsePayload,
    request: Request,
    user: Optional[User] = Depends(get_optional_user),
):
    try:
        xff = request.headers.get("x-forwarded-for")
        ip = (xff.split(",")[0].strip() if xff else request.client.host) if request.client else None
        user_agent = request.headers.get("user-agent")

        # Ensure the referenced survey exists to satisfy FK constraint.
        # Accept survey_id in format "{survey_type}:{survey_version}" (e.g., "patient:v1").
        survey_id = payload.survey_id
        if ":" not in survey_id:
            raise HTTPException(status_code=400, detail="Invalid survey_id format. Expected 'type:version', e.g., 'patient:v1'.")
        survey_type, survey_version = survey_id.split(":", 1)

        try:
            # Upsert minimal survey catalog entry. Using on_conflict=id aligns with PK.
            _ = (
                supabase
                .table("surveys")
                .upsert(
                    {
                        "id": survey_id,
                        "survey_type": survey_type,
                        "survey_version": survey_version,
                        # Keep status active so the definition (if later added) is selectable
                        "status": "active",
                    },
                    on_conflict="id",
                )
                .execute()
            )
        except Exception:
            # Non-fatal: if it already exists or races, continue to response upsert
            pass

        data = {
            # Prefer explicit columns if present (post-migration). survey_id will be generated.
            "survey_type": survey_type,
            "survey_version": survey_version,
            "survey_id": survey_id,  # compatibility if generated column not present yet
            "client_session_id": payload.client_session_id,
            "answers": payload.answers,
            "is_autosave": payload.is_autosave,
            "ip_address": ip,
            "user_agent": user_agent,
            "auth_user_id": getattr(user, "id", None) if user else None,
        }
        if payload.answers_text is not None:
            data["answers_text"] = payload.answers_text

        # Manual upsert by (survey_id, client_session_id) to avoid PostgREST 409s.
        update_res = (
            supabase
            .table("survey_responses")
            .update(data)
            .eq("survey_id", survey_id)
            .eq("client_session_id", payload.client_session_id)
            .execute()
        )
        rows = update_res.data or []
        if not rows:
            insert_res = supabase.table("survey_responses").insert(data).execute()
            inserted = (insert_res.data or [None])[0]
        else:
            inserted = rows[0]

        # If this call is a final submission (not autosave), mark record as submitted
        if payload.submit or (not payload.is_autosave):
            try:
                submit_update = (
                    supabase
                    .table("survey_responses")
                    .update({"submitted_at": "now()", "finalized": True})
                    .eq("survey_id", survey_id)
                    .eq("client_session_id", payload.client_session_id)
                    .execute()
                )
                if submit_update.data:
                    inserted = submit_update.data[0]
            except Exception:
                pass
        return {"status": "ok", "id": inserted.get("id") if inserted else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



