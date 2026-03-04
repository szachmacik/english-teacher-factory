import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Play, Trash2, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onRecordingComplete: (audioUrl: string, transcript?: string) => void;
  maxDurationSeconds?: number;
}

type RecordingState = "idle" | "recording" | "recorded" | "uploading" | "done";

export default function VoiceRecorder({ onRecordingComplete, maxDurationSeconds = 300 }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState("recorded");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250);
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= maxDurationSeconds - 1) {
            stopRecording();
            return maxDurationSeconds;
          }
          return d + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access denied", { description: "Please allow microphone access in your browser settings." });
    }
  }, [maxDurationSeconds]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const discardRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadedUrl(null);
    setDuration(0);
    setState("idle");
  }, [audioUrl]);

  const uploadRecording = useCallback(async () => {
    if (!audioBlob) return;
    setState("uploading");
    try {
      const ext = audioBlob.type.includes("webm") ? "webm" : "ogg";
      const response = await fetch("/api/upload/audio", {
        method: "POST",
        headers: {
          "Content-Type": audioBlob.type,
          "x-file-ext": ext,
        },
        body: audioBlob,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      const { url } = await response.json() as { url: string };
      setUploadedUrl(url);
      setState("done");
      toast.success("Recording uploaded!", { description: "AI will transcribe your voice note." });
      onRecordingComplete(url);
    } catch (err) {
      toast.error("Upload failed", { description: err instanceof Error ? err.message : "Unknown error" });
      setState("recorded");
    }
  }, [audioBlob, onRecordingComplete]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const progress = (duration / maxDurationSeconds) * 100;

  return (
    <div className="space-y-4">
      {/* Recording UI */}
      {state === "idle" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center hover:bg-red-500/20 transition-colors cursor-pointer" onClick={startRecording}>
            <Mic className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm text-muted-foreground">Click to start recording</p>
          <p className="text-xs text-muted-foreground">Max {Math.floor(maxDurationSeconds / 60)} minutes</p>
        </div>
      )}

      {state === "recording" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center animate-pulse cursor-pointer" onClick={stopRecording}>
              <Square className="w-8 h-8 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="animate-pulse">● REC</Badge>
            <span className="font-mono text-lg font-bold">{formatTime(duration)}</span>
          </div>
          <Progress value={progress} className="w-48 h-2" />
          <p className="text-xs text-muted-foreground">Click the square to stop</p>
        </div>
      )}

      {state === "recorded" && audioUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
            <Play className="w-4 h-4 text-primary shrink-0" />
            <audio src={audioUrl} controls className="flex-1 h-8" style={{ minWidth: 0 }} />
            <span className="text-xs text-muted-foreground font-mono shrink-0">{formatTime(duration)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={discardRecording} className="gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Discard
            </Button>
            <Button size="sm" onClick={uploadRecording} className="gap-1.5 flex-1">
              <Upload className="w-3.5 h-3.5" /> Use This Recording
            </Button>
          </div>
        </div>
      )}

      {state === "uploading" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Uploading recording...</p>
        </div>
      )}

      {state === "done" && uploadedUrl && (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Recording ready</p>
            <p className="text-xs text-muted-foreground truncate">{uploadedUrl}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={discardRecording} className="shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
