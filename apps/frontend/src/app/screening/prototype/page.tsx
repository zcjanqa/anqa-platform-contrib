"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function PrototypeScreeningPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState<boolean>(false);
  const [hasPrototypeAccess, setHasPrototypeAccess] = useState<boolean>(false);
  const hasAutostartedRef = useRef<boolean>(false);

  // Protect route: must be logged in and prototype_enabled
  useEffect(() => {
    const check = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.replace("/login?next=/screening/prototype");
          return;
        }
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://anqa.cloud/api";
        const resp = await fetchWithAuth(`${backendBase.replace(/\/$/, "")}/account/me`);
        if (resp.ok) {
          const me = await resp.json();
          setHasPrototypeAccess(Boolean(me?.prototype_enabled));
        } else {
          // If token invalid or server error, keep user on page and show message below
          setHasPrototypeAccess(false);
        }
      } catch {
        setHasPrototypeAccess(false);
      }
      setAccessChecked(true);
    };
    check();
  }, [router]);

  const start = useCallback(async (forcedSessionId?: string) => {
    setError(null);
    setPublishing(true);
    try {
      // Prevent starting if access not granted
      if (!hasPrototypeAccess) {
        throw new Error("Prototype access is not granted for this account");
      }
      // If an existing peer connection is active, stop it first to avoid duplicates
      if (pcRef.current) {
        try { await (async () => { const pc = pcRef.current; pcRef.current = null; if (pc) pc.getSenders().forEach((s) => s.track && s.track.stop()); if (pc) pc.close(); })(); } catch {}
        // Best-effort close of previous session on backend
        const backendBasePrev = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://anqa.cloud/api";
        if (sessionId) {
          try { await fetchWithAuth(`${backendBasePrev.replace(/\/$/, "")}/webrtc/close?session_id=${encodeURIComponent(sessionId)}`, { method: "POST" }); } catch {}
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 1280, ideal: 1280 },
          height: { min: 720, ideal: 720 },
          frameRate: { min: 30, ideal: 30, max: 30 },
          aspectRatio: 16 / 9,
          facingMode: "user",
        },
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      // Strengthen constraints on the acquired track as well
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          await videoTrack.applyConstraints({
            width: { min: 1280, ideal: 1280 },
            height: { min: 720, ideal: 720 },
            frameRate: { min: 30, ideal: 30, max: 30 },
            aspectRatio: 16 / 9,
          } as MediaTrackConstraints);
        } catch {}
        try { (videoTrack as any).contentHint = "detail"; } catch {}
      }
      if (videoRef.current) (videoRef.current as HTMLVideoElement).srcObject = stream as any;

      // Fetch ephemeral TURN credentials from backend and configure ICE servers
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://anqa.cloud/api";
      let iceServers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];
      try {
        const credsResp = await fetchWithAuth(`${backendBase.replace(/\/$/, "")}/webrtc/turn-credentials`);
        if (credsResp.ok) {
          const creds = await credsResp.json();
          iceServers = [
            { urls: ["stun:stun.l.google.com:19302"] },
            { urls: creds.urls, username: creds.username, credential: creds.credential },
          ];
        }
      } catch {}

      const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'relay' as any });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Prefer maintaining resolution and allocate sufficient bitrate for 720p
      try {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          const params = sender.getParameters();
          params.encodings = [{
            rid: "h",
            maxBitrate: 2_500_000, // ~2.5 Mbps for 720p
            maxFramerate: 30,
            scaleResolutionDownBy: 1.0,
          }];
          try { (params as any).degradationPreference = "maintain-resolution"; } catch {}
          await sender.setParameters(params);
        }
      } catch {}

      pc.addEventListener('iceconnectionstatechange', () => {
        console.log('[webrtc] iceconnectionstate:', pc.iceConnectionState);
      });
      pc.addEventListener('connectionstatechange', () => {
        console.log('[webrtc] connectionstate:', pc.connectionState);
      });

      const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      // Wait for ICE gathering to complete (no trickle)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", check);
        // Safety timeout
        setTimeout(() => {
          pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        }, 2000);
      });

      const sid = forcedSessionId || crypto.randomUUID();
      setSessionId(sid);
      const resp = await fetchWithAuth(`${backendBase.replace(/\/$/, "")}/webrtc/offer?session_id=${encodeURIComponent(sid)}`, {
        method: "POST",
        headers: { "content-type": "application/sdp" },
        body: (pc.localDescription?.sdp as string) || (offer.sdp as string) || "",
      });
      if (!resp.ok) throw new Error(`Offer failed: ${resp.status}`);
      const answerSdp = await resp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to start streaming");
      setPublishing(false);
      return;
    }
    setPublishing(false);
  }, [hasPrototypeAccess, sessionId]);

  const stop = useCallback(async () => {
    try {
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://anqa.cloud/api";
      if (sessionId) {
        // Ask server to finalize first to avoid races where local close triggers pc failed/closed earlier
        try {
          await fetchWithAuth(`${backendBase.replace(/\/$/, "")}/webrtc/close?session_id=${encodeURIComponent(sessionId)}`, { method: "POST" });
        } catch {}
      }
      const pc = pcRef.current;
      pcRef.current = null;
      if (pc) pc.getSenders().forEach((s) => s.track && s.track.stop());
      if (pc) pc.close();
    } catch (e) {
      // ignore
    }
  }, [sessionId]);

  // Auto-start once based on initial URL query params, deduped across StrictMode remounts using sessionStorage
  useEffect(() => {
    try {
      const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const autostart = sp.get("autostart");
      const sid = sp.get("session_id");
      if (autostart === "1" && accessChecked && hasPrototypeAccess) {
        const key = `prototype_autostart_${sid || "default"}`;
        const already = typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null;
        if (!already && !hasAutostartedRef.current) {
          hasAutostartedRef.current = true;
          if (typeof window !== "undefined") window.sessionStorage.setItem(key, "1");
          start(sid || undefined);
        }
      }
    } catch {}
  }, [start, accessChecked, hasPrototypeAccess]);

  // Clean up on unmount only
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return (
    <div className="w-full min-h-[70vh] bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-black p-6">
      <div className="max-w-[900px] mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight dark:text-slate-100">Demo Screening</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">We'll begin the interactive demo screening here. Grant camera and mic to start a secure test stream.</p>
          {accessChecked && !hasPrototypeAccess && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">Anqa has not yet granted you access to try the prototype. If you think a mistake has been made contact support@anqa.cloud</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="aspect-video w-full rounded-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden bg-black/5 dark:bg-white/5">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => start()} disabled={publishing || !hasPrototypeAccess || !accessChecked} className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-black disabled:opacity-50 dark:bg-white dark:text-slate-900 shadow-sm ring-1 ring-black/5 dark:ring-white/20 transition-all hover:shadow-md">
              {publishing ? "Starting…" : "Start secure stream"}
            </button>
            <button onClick={stop} className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/20 transition-all hover:shadow-md">
              Stop & save
            </button>
            {sessionId && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Session: {sessionId}</p>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="pt-2">
              <Link href="/screening" className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 shadow-sm ring-1 ring-black/5 dark:ring-white/20 transition-all hover:shadow-md">
                Back to overview
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
