from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import os
import tempfile
import uuid
from datetime import datetime, timezone
import logging
import time
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack, RTCConfiguration, RTCIceServer
from aiortc.contrib.media import MediaRecorder, MediaRelay
import subprocess

from app.core.auth import get_current_user, User
from app.core.config import Settings
from app.core.supabase_client import supabase


router = APIRouter(prefix="/webrtc", tags=["webrtc"])


class OfferBody(BaseModel):
    sdp: str
    type: str = "offer"
    session_id: Optional[str] = None


class TurnCredentialsResponse(BaseModel):
    urls: list[str]
    username: str
    credential: str
    ttl: int


class _SessionState(BaseModel):
    session_id: str
    pc_id: str
    started_at: datetime
    tmp_mp4_path: str
    format_name: str = "mp4"
    recorder_started: bool = False
    recorder: Optional[MediaRecorder] = None
    recorder_start_task: Optional[asyncio.Task] = None
    analysis_tasks: list[asyncio.Task] = []
    # Finalization state
    is_finalized: bool = False
    uploaded_webm_key: Optional[str] = None
    uploaded_wav_key: Optional[str] = None
    # Pydantic v2: allow non-pydantic types like MediaRecorder
    model_config = {"arbitrary_types_allowed": True}


_sessions: dict[str, _SessionState] = {}
_pcs: dict[str, RTCPeerConnection] = {}
_relay = MediaRelay()
_log = logging.getLogger(__name__)


def _recordings_bucket() -> str:
    return os.getenv("SUPABASE_RECORDINGS_BUCKET", "recordings")


def _recorder_formats() -> tuple[str, str]:
    """Select primary and fallback container formats for MediaRecorder.

    - Primary is from WEBRTC_RECORDER_FORMAT, defaulting to 'mp4'.
    - Fallback is from WEBRTC_RECORDER_FALLBACK, defaulting to 'matroska' (MKV).
    """
    def _norm(x: str) -> str:
        x = (x or "").strip().lower()
        if x in ("mkv", "matroska"):
            return "matroska"
        if x in ("webm",):
            return "webm"
        return "mp4"

    primary = _norm(os.getenv("WEBRTC_RECORDER_FORMAT") or "mp4")
    fallback = _norm(os.getenv("WEBRTC_RECORDER_FALLBACK") or "matroska")
    return primary, fallback


def _recording_extension(format_name: str) -> str:
    if format_name == "matroska":
        return ".mkv"
    if format_name == "webm":
        return ".webm"
    return ".mp4"


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if xff:
        # take first IP
        return xff.split(",")[0].strip()
    try:
        return request.client.host if request.client else ""
    except Exception:
        return ""


def _frontend_host() -> str:
    """Resolve the frontend host (domain) without scheme for building TURN host.

    Prefers DOMAIN_FRONTEND if set; otherwise falls back to Settings().get_frontend_public_url().
    """
    domain_env = (os.getenv("DOMAIN_FRONTEND") or "").strip().strip("/")
    if domain_env:
        if domain_env.startswith("http://") or domain_env.startswith("https://"):
            parsed = urlparse(domain_env)
            return parsed.netloc
        return domain_env
    try:
        url = Settings().get_frontend_public_url()
        parsed = urlparse(url)
        return parsed.netloc or url.replace("http://", "").replace("https://", "")
    except Exception:
        return "anqa.cloud"


def _turn_host() -> str:
    """Derive TURN hostname; allow explicit override via TURN_HOST, else use turn.<frontend-host>."""
    override = (os.getenv("TURN_HOST") or "").strip()
    if override:
        return override
    frontend = _frontend_host()
    # Avoid double 'turn.' if someone already provided it
    return frontend if frontend.startswith("turn.") else f"turn.{frontend}"


def _mint_turn_credentials(ttl_seconds: int = 3600) -> tuple[list[str], str, str, int]:
    """Generate ephemeral TURN credentials using TURN_STATIC_AUTH_SECRET.

    Returns (urls, username, credential, ttl).
    """
    secret = os.getenv("TURN_STATIC_AUTH_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="TURN is not configured: missing TURN_STATIC_AUTH_SECRET")

    # username is expiry epoch time in seconds (as string)
    username = str(int(time.time()) + ttl_seconds)
    digest = hmac.new(secret.encode("utf-8"), username.encode("utf-8"), hashlib.sha1).digest()
    password = base64.b64encode(digest).decode("utf-8")

    host = _turn_host()
    urls = [
        f"turn:{host}:3478?transport=udp",
        # Enable once TLS certs are mounted in TURN container
        # f"turns:{host}:5349",
    ]
    # Optionally include TURNS (TLS over TCP) for restrictive networks
    try:
        enable_turns = (os.getenv("TURN_ENABLE_TURNS") or os.getenv("TURN_ENABLE_TLS") or "").lower() in ("1", "true", "yes")
        if enable_turns:
            urls.append(f"turns:{host}:5349?transport=tcp")
    except Exception:
        pass
    return urls, username, password, ttl_seconds


def _server_rtc_configuration() -> Optional[RTCConfiguration]:
    """Build RTCConfiguration for the server peer using the same TURN.

    Returns None if TURN is not configured, in which case aiortc defaults to host/srflx only.
    """
    try:
        urls, username, credential, _ttl = _mint_turn_credentials(ttl_seconds=3600)
    except HTTPException:
        return None
    except Exception:
        return None
    # Build config without unsupported kwargs; set relay-only if attribute exists
    cfg = RTCConfiguration(
        iceServers=[RTCIceServer(urls=urls, username=username, credential=credential)]
    )
    for attr in ("iceTransportPolicy", "ice_transport_policy"):
        if hasattr(cfg, attr):
            try:
                setattr(cfg, attr, "relay")
            except Exception:
                pass
            break
    return cfg


async def _finalize_and_upload(state: _SessionState) -> tuple[Optional[str], Optional[str]]:
    # Idempotency guard
    if state.is_finalized:
        _log.info("[webrtc][%s] finalize: already finalized webm=%s wav=%s", state.session_id, state.uploaded_webm_key, state.uploaded_wav_key)
        return state.uploaded_webm_key, state.uploaded_wav_key
    try:
        # Ensure recorder has actually started before stopping
        if state.recorder_start_task and not state.recorder_start_task.done():
            try:
                await asyncio.wait_for(state.recorder_start_task, timeout=5.0)
            except Exception as e:
                _log.warning("[webrtc][%s] recorder.start task wait failed: %s", state.session_id, e)
        if state.recorder and state.recorder_started:
            _log.info("[webrtc][%s] recorder.stop begin path=%s", state.session_id, state.tmp_mp4_path)
            try:
                await state.recorder.stop()
                _log.info("[webrtc][%s] recorder.stop done path=%s", state.session_id, state.tmp_mp4_path)
            except Exception as e:
                _log.exception("[webrtc][%s] recorder.stop failed: %s", state.session_id, e)
        else:
            _log.info("[webrtc][%s] recorder.stop skipped started=%s has_recorder=%s", state.session_id, state.recorder_started, bool(state.recorder))
    except Exception as e:
        _log.warning("[webrtc][%s] recorder finalize block error: %s", state.session_id, e)

    # Extract audio-only WAV using ffmpeg
    wav_path = state.tmp_mp4_path.rsplit(".", 1)[0] + ".wav"
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                state.tmp_mp4_path,
                "-vn",
                "-acodec",
                "pcm_s16le",
                "-ar",
                "48000",
                "-ac",
                "1",
                wav_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        wav_path = ""

    # Always produce a browser-friendly MP4 via ffmpeg (yuv420p, faststart)
    # Never transcode to the same input path to avoid ffmpeg clobbering/183 exit
    in_dir, in_name = os.path.dirname(state.tmp_mp4_path), os.path.basename(state.tmp_mp4_path)
    in_root, in_ext = os.path.splitext(in_name)
    # If input already ends with .mp4, place transcoded file next to it with a suffix
    out_name = f"{in_root}.transcoded.mp4" if in_ext.lower() == ".mp4" else f"{in_root}.mp4"
    mp4_transcoded_path = os.path.join(in_dir, out_name)
    mp4_ready_path = state.tmp_mp4_path
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                # Generate missing/monotonic PTS to fix non-monotonic DTS from real-time recording
                "-fflags", "+genpts",
                "-i",
                state.tmp_mp4_path,
                # Select first video/audio streams if present, optionally (the '?' avoids failure if missing)
                "-map", "0:v:0?", "-map", "0:a:0?",
                # Enforce constant frame rate on output
                "-r", os.getenv("FFMPEG_FPS", "30"),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-preset",
                os.getenv("FFMPEG_PRESET", "veryfast"),
                "-crf",
                os.getenv("FFMPEG_CRF", "23"),
                # Force CFR output; duplicate/drop frames to match -r
                "-vsync", "cfr",
                "-movflags",
                "+faststart",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-ar",
                "48000",
                "-ac",
                "2",
                # Align output duration to the shortest stream to avoid trailing black/silence
                "-shortest",
                mp4_transcoded_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        # If the transcoded file exists and is non-empty, use it
        if os.path.exists(mp4_transcoded_path) and os.path.getsize(mp4_transcoded_path) > 0:
            mp4_ready_path = mp4_transcoded_path
    except Exception as e:
        _log.warning("[webrtc][%s] mp4 transcode failed, will upload original container: %s", state.session_id, e)

    # Mid-stream and post-stop file presence/growth probe (extended flush window)
    try:
        max_checks = 20  # ~4s total at 200ms
        last_size = -1
        for i in range(max_checks):
            exists = os.path.exists(state.tmp_mp4_path)
            size = os.path.getsize(state.tmp_mp4_path) if exists else -1
            if i == 0 or size != last_size:
                _log.info("[webrtc][%s] flush check %s exists=%s size=%s path=%s", state.session_id, i, exists, size, state.tmp_mp4_path)
            last_size = size
            if exists and size > 0:
                break
            await asyncio.sleep(0.2)
    except Exception as e:
        _log.warning("[webrtc][%s] flush probe error: %s", state.session_id, e)
    try:
        exists = os.path.exists(state.tmp_mp4_path)
        size = os.path.getsize(state.tmp_mp4_path) if exists else -1
        _log.info("[webrtc][%s] finalize file check exists=%s size=%s path=%s", state.session_id, exists, size, state.tmp_mp4_path)
        if exists and size > 0:
            _log.info("[webrtc][%s] finalize file was created and has size=%s", state.session_id, size)
    except Exception as e:
        _log.warning("[webrtc][%s] finalize file stat failed: %s", state.session_id, e)

    # Upload artifacts to Supabase Storage (idempotent: remove if exists)
    bucket = _recordings_bucket()
    session_key_base = f"sessions/{state.session_id}"

    def _upload(path: str, key_suffix: str) -> Optional[str]:
        if not path or not os.path.exists(path):
            _log.info("[webrtc][%s] upload skipped (missing): %s", state.session_id, path)
            return None
        try:
            size = os.path.getsize(path)
        except Exception:
            size = -1
        _log.info("[webrtc][%s] upload candidate exists=%s size=%s path=%s", state.session_id, True, size, path)
        # Always honor the provided key suffix; choose content-type from extension
        key = f"{session_key_base}/{key_suffix}"
        try:
            supabase.storage.from_(bucket).remove([key])
        except Exception:
            pass
        with open(path, "rb") as f:
            # supabase-py v2 (storage3): pass structured options, avoid booleans in headers
            if key.endswith(".mkv"):
                file_options = {"content_type": "video/x-matroska"}
            elif key.endswith(".webm"):
                file_options = {"content_type": "video/webm"}
            elif key.endswith(".mp4"):
                file_options = {"content_type": "video/mp4"}
            else:
                file_options = {"content_type": "audio/wav"}
            try:
                _log.info("[webrtc][%s] uploading %s bytes to %s/%s", state.session_id, os.path.getsize(path), bucket, key)
                res = supabase.storage.from_(bucket).upload(key, f, file_options=file_options)
                _log.info("[webrtc][%s] upload response: %s", state.session_id, res)
            except Exception as e:
                _log.error("[webrtc][%s] upload failed for %s: %s", state.session_id, key, e)
                raise
            # Try to extract a path-like value from various possible response shapes; fallback to key
            try:
                if isinstance(res, dict):
                    return res.get("path") or res.get("Key") or res.get("fullPath") or res.get("name") or key
                # Some clients return an HTTPX/Requests Response
                if hasattr(res, "json"):
                    try:
                        j = res.json()
                        if isinstance(j, dict):
                            return j.get("path") or j.get("Key") or j.get("fullPath") or j.get("name") or key
                    except Exception:
                        pass
                # Some clients wrap data in a .data attribute
                data_attr = getattr(res, "data", None)
                if isinstance(data_attr, dict):
                    return data_attr.get("path") or data_attr.get("Key") or data_attr.get("fullPath") or data_attr.get("name") or key
            except Exception:
                pass
            return key

    # Decide which recording file to upload and suffix
    if mp4_ready_path.endswith(".mp4") and os.path.exists(mp4_ready_path):
        recording_suffix = "recording.mp4"
        recording_path = mp4_ready_path
    else:
        # Fallback to original container
        recording_path = state.tmp_mp4_path
        if recording_path.endswith(".mkv"):
            recording_suffix = "recording.mkv"
        elif recording_path.endswith(".webm"):
            recording_suffix = "recording.webm"
        else:
            recording_suffix = os.path.basename(recording_path)
    mp4_key = _upload(recording_path, recording_suffix)
    wav_key = _upload(wav_path, "audio.wav") if wav_path else None

    # Save results on state before cleanup
    state.is_finalized = True
    state.uploaded_webm_key = mp4_key
    state.uploaded_wav_key = wav_key

    # Optionally: write metadata table row here
    # For MVP, skip DB row; rely on object keys.

    # Cleanup temp files
    try:
        if os.path.exists(state.tmp_mp4_path):
            os.remove(state.tmp_mp4_path)
        if mp4_transcoded_path and os.path.exists(mp4_transcoded_path):
            try:
                os.remove(mp4_transcoded_path)
            except Exception:
                pass
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)
    except Exception:
        pass

    return mp4_key, wav_key


@router.post("/offer", response_class=PlainTextResponse)
async def handle_offer(
    request: Request,
    user: User = Depends(get_current_user),
) -> Response:
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    session_id = request.query_params.get("session_id") or str(uuid.uuid4())

    # If a session with the same id already exists, close and finalize it to avoid zombies
    try:
        existing_state = _sessions.get(session_id)
        if existing_state:
            old_pc = _pcs.get(existing_state.pc_id)
            try:
                if old_pc:
                    await old_pc.close()
            except Exception:
                pass
            try:
                await _finalize_and_upload(existing_state)
            except Exception:
                pass
            _pcs.pop(existing_state.pc_id, None)
            _sessions.pop(session_id, None)
    except Exception:
        pass

    # Read body as text if content-type is application/sdp; otherwise parse json
    content_type = request.headers.get("content-type", "").lower()
    if "application/sdp" in content_type:
        offer_sdp = await request.body()
        offer_text = offer_sdp.decode("utf-8") if isinstance(offer_sdp, (bytes, bytearray)) else str(offer_sdp)
        offer = RTCSessionDescription(sdp=offer_text, type="offer")
    else:
        data = await request.json()
        model = OfferBody(**data)
        offer = RTCSessionDescription(sdp=model.sdp, type=model.type)

    cfg = _server_rtc_configuration()
    pc = RTCPeerConnection(cfg) if cfg else RTCPeerConnection()
    pc_id = str(uuid.uuid4())
    _pcs[pc_id] = pc

    tmp_dir = tempfile.mkdtemp(prefix="webrtc_")
    primary_fmt, fallback_fmt = _recorder_formats()
    # Workaround: aiortc/PyAV can produce non-monotonic DTS when writing MP4 directly.
    # Record to Matroska for stability when primary is mp4, then transcode to MP4 on finalize.
    internal_fmt = "matroska" if primary_fmt == "mp4" else primary_fmt
    tmp_mp4_path = os.path.join(tmp_dir, f"{session_id}{_recording_extension(internal_fmt)}")
    recorder = MediaRecorder(tmp_mp4_path, format=internal_fmt)

    state = _SessionState(
        session_id=session_id,
        pc_id=pc_id,
        started_at=datetime.now(timezone.utc),
        tmp_mp4_path=tmp_mp4_path,
        format_name=internal_fmt,
        recorder=recorder,
    )
    _sessions[session_id] = state

    # Insert or upsert a screenings row at start
    try:
        headers = request.headers
        ua = headers.get("user-agent") or headers.get("User-Agent") or ""
        ip = _client_ip(request)
        _log.info("[webrtc][%s] screenings.upsert begin user_id=%s ip=%s ua_len=%s", session_id, user.id, ip, len(ua or ""))
        res = supabase.table("screenings").upsert({
            "id": session_id,
            "user_id": user.id,
            "started_at": state.started_at.isoformat(),
            "client_ip": ip,
            "user_agent": ua,
            "status": "in_progress",
        }, on_conflict="id").execute()
        _log.info("[webrtc][%s] screenings.upsert done resp=%s", session_id, getattr(res, "data", None) or getattr(res, "__dict__", None))
    except Exception as e:
        _log.error("[webrtc][%s] screenings upsert failed: %s", session_id, e)

    analysis_tasks: list[asyncio.Task] = []

    @pc.on("track")
    def on_track(track: MediaStreamTrack) -> None:
        # Tee incoming tracks: create distinct relay subscriptions for recorder and analysis
        recorder_relayed = _relay.subscribe(track)
        analysis_relayed = _relay.subscribe(track)
        _log.info("[webrtc][%s] on_track kind=%s -> relayed", session_id, track.kind)
        try:
            if state.recorder:
                state.recorder.addTrack(recorder_relayed)
                _log.info("[webrtc][%s] recorder.addTrack kind=%s started=%s path=%s", session_id, track.kind, state.recorder_started, state.tmp_mp4_path)
        except Exception:
            pass

        # Ensure the recorder is started once when the first track arrives
        if state.recorder and not state.recorder_started and not state.recorder_start_task:
            async def _start_recorder() -> None:
                try:
                    _log.info("[webrtc][%s] recorder.start begin fmt=%s path=%s", state.session_id, state.format_name, state.tmp_mp4_path)
                    await state.recorder.start()
                    state.recorder_started = True
                    _log.info("[webrtc][%s] recorder started -> %s", state.session_id, state.tmp_mp4_path)
                except Exception as e:
                    state.recorder_started = False
                    _log.exception("[webrtc][%s] recorder.start failed (fmt=%s): %s", state.session_id, state.format_name, e)
                    # Attempt fallback to alternate container format
                    try:
                        if fallback_fmt and fallback_fmt != state.format_name:
                            new_path = os.path.join(os.path.dirname(state.tmp_mp4_path), f"{session_id}{_recording_extension(fallback_fmt)}")
                            _log.info("[webrtc][%s] recorder.fallback begin fmt=%s path=%s", state.session_id, fallback_fmt, new_path)
                            try:
                                await state.recorder.stop()
                            except Exception:
                                pass
                            state.tmp_mp4_path = new_path
                            state.format_name = fallback_fmt
                            state.recorder = MediaRecorder(new_path, format=fallback_fmt)
                            try:
                                state.recorder.addTrack(recorder_relayed)
                            except Exception:
                                pass
                            await state.recorder.start()
                            state.recorder_started = True
                            _log.info("[webrtc][%s] recorder.fallback started -> %s", state.session_id, state.tmp_mp4_path)
                    except Exception as ef:
                        state.recorder_started = False
                        _log.exception("[webrtc][%s] recorder.fallback failed: %s", state.session_id, ef)
            state.recorder_start_task = asyncio.create_task(_start_recorder())

        if track.kind == "video":
            async def video_worker() -> None:
                # Minimal real-time analysis stub: count frames per second
                frame_count = 0
                start = asyncio.get_event_loop().time()
                while True:
                    try:
                        frame = await analysis_relayed.recv()
                    except Exception:
                        break
                    frame_count += 1
                    now = asyncio.get_event_loop().time()
                    if now - start >= 5.0:
                        fps = frame_count / (now - start)
                        # Placeholder: emit to logs or future websocket
                        print(f"[analysis][{session_id}] video fps ~ {fps:.1f}")
                        # Probe file existence mid-stream (infrequent)
                        try:
                            exists = os.path.exists(state.tmp_mp4_path)
                            size = os.path.getsize(state.tmp_mp4_path) if exists else -1
                            _log.info("[webrtc][%s] midstream probe exists=%s size=%s path=%s", session_id, exists, size, state.tmp_mp4_path)
                        except Exception:
                            pass
                        start = now
                        frame_count = 0
            task = asyncio.create_task(video_worker())
            analysis_tasks.append(task)
            state.analysis_tasks.append(task)

        elif track.kind == "audio":
            async def audio_worker() -> None:
                # Minimal audio analysis stub: sample counter
                sample_frames = 0
                start = asyncio.get_event_loop().time()
                while True:
                    try:
                        frame = await analysis_relayed.recv()
                    except Exception:
                        break
                    sample_frames += getattr(frame, "samples", 0)
                    now = asyncio.get_event_loop().time()
                    if now - start >= 5.0:
                        print(f"[analysis][{session_id}] audio frames in 5s: {sample_frames}")
                        sample_frames = 0
                        start = now
            task = asyncio.create_task(audio_worker())
            analysis_tasks.append(task)
            state.analysis_tasks.append(task)

    @pc.on("connectionstatechange")
    async def on_state_change() -> None:
        _log.info("[webrtc][%s] connectionstate=%s", session_id, pc.connectionState)
        if pc.connectionState in ("failed", "closed"):
            mp4_key, wav_key = await _finalize_and_upload(state)
            try:
                await pc.close()
            except Exception:
                pass
            _pcs.pop(pc_id, None)
            _sessions.pop(session_id, None)
            for t in analysis_tasks:
                t.cancel()
            # Update screenings row
            try:
                _log.info("[webrtc][%s] screenings.update(auto) webm=%s wav=%s", session_id, mp4_key, wav_key)
                r = supabase.table("screenings").update({
                    "ended_at": datetime.now(timezone.utc).isoformat(),
                    "status": "completed",
                    "storage_recording_key": mp4_key,
                    "storage_audio_key": wav_key,
                }).eq("id", session_id).execute()
                _log.info("[webrtc][%s] screenings.update(auto) resp=%s", session_id, getattr(r, "data", None) or getattr(r, "__dict__", None))
            except Exception as e:
                _log.error("[webrtc][%s] screenings update failed: %s", session_id, e)
            _log.info("[webrtc][%s] finalized recording: webm=%s wav=%s", session_id, mp4_key, wav_key)

    # Apply remote description
    await pc.setRemoteDescription(offer)

    # Recorder is started lazily on first incoming track to avoid empty files

    # Create and set local description (answer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    # Wait for ICE gathering to complete before returning SDP (no trickle)
    async def _wait_ice_complete() -> None:
        if pc.iceGatheringState == "complete":
            return
        done = asyncio.get_event_loop().create_future()
        def _on_change() -> None:
            if pc.iceGatheringState == "complete" and not done.done():
                done.set_result(None)
        pc.on("icegatheringstatechange", _on_change)  # type: ignore
        try:
            await asyncio.wait_for(done, timeout=2.0)
        except Exception:
            pass
    try:
        await _wait_ice_complete()
    except Exception:
        pass

    # Return SDP answer as plain text
    return PlainTextResponse(pc.localDescription.sdp)


@router.post("/close")
async def close_session(
    session_id: str,
    user: User = Depends(get_current_user),
) -> dict:
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    state = _sessions.get(session_id)
    mp4_key: Optional[str] = None
    wav_key: Optional[str] = None

    if state:
        pc = _pcs.get(state.pc_id)
        try:
            if pc:
                await pc.close()
        except Exception:
            pass
        # Cancel analysis tasks explicitly
        for t in state.analysis_tasks:
            try:
                t.cancel()
            except Exception:
                pass
        mp4_key, wav_key = await _finalize_and_upload(state)
        _pcs.pop(state.pc_id, None)
        _sessions.pop(session_id, None)

    # Update screenings row on explicit close even if state is missing
    try:
        _log.info("[webrtc][%s] screenings.update(explicit close) webm=%s wav=%s", session_id, mp4_key, wav_key)
        rr = supabase.table("screenings").update({
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed",
            "storage_recording_key": mp4_key,
            "storage_audio_key": wav_key,
        }).eq("id", session_id).execute()
        _log.info("[webrtc][%s] screenings.update(explicit close) resp=%s", session_id, getattr(rr, "data", None) or getattr(rr, "__dict__", None))
    except Exception as e:
        _log.error("[webrtc][%s] screenings update failed: %s", session_id, e)

    return {"status": "closed", "storage_recording_key": mp4_key, "storage_audio_key": wav_key, "had_state": bool(state)}


@router.get("/debug")
async def debug_session(
    session_id: str,
    user: User = Depends(get_current_user),
) -> dict:
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    state = _sessions.get(session_id)
    bucket = _recordings_bucket()
    tmp_exists = False
    tmp_size = 0
    if state and state.tmp_mp4_path:
        tmp_exists = os.path.exists(state.tmp_mp4_path)
        try:
            tmp_size = os.path.getsize(state.tmp_mp4_path) if tmp_exists else 0
        except Exception:
            tmp_size = 0
    # List any uploaded objects for this session
    objects = []
    try:
        objects = supabase.storage.from_(bucket).list(path=f"sessions/{session_id}") or []
    except Exception as e:
        _log.warning("[webrtc][%s] list failed: %s", session_id, e)
    return {
        "active": bool(state is not None),
        "pc_id": getattr(state, "pc_id", None),
        "tmp_path": getattr(state, "tmp_mp4_path", None),
        "tmp_exists": tmp_exists,
        "tmp_size": tmp_size,
        "bucket": bucket,
        "objects": objects,
    }


@router.get("/turn-credentials", response_model=TurnCredentialsResponse)
async def get_turn_credentials(
    user: User = Depends(get_current_user),
) -> TurnCredentialsResponse:
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    urls, username, credential, ttl = _mint_turn_credentials(ttl_seconds=3600)
    return TurnCredentialsResponse(urls=urls, username=username, credential=credential, ttl=ttl)


