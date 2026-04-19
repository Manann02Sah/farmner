import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogIn, MessageSquare, Mic, MicOff, Plus, Send, Sparkles, Square, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChatMessages, useChatSessions, useCreateSession, useSendMessage } from "@/hooks/useChat";
import { useSchemes } from "@/hooks/useSchemes";
import { supabase } from "@/integrations/supabase/client";
import { invokeFormDataEdgeFunction } from "@/lib/edgeFunctions";
import { getSupabaseFunctionUrl, getSupabasePublishableKey } from "@/lib/supabaseConfig";
import { findRelevantSchemes, MatchedScheme } from "@/lib/schemeMatching";

const CHAT_URL = getSupabaseFunctionUrl("chat");
const TRANSCRIBE_URL = getSupabaseFunctionUrl("transcribe-audio");
const PUBLISHABLE_KEY = getSupabasePublishableKey();

type ChatRole = "user" | "assistant";
type ChatSources = {
  matchedSchemes?: MatchedScheme[];
};

type ChatMessage = { role: ChatRole; content: string; sources?: ChatSources | null };
type VoiceState = "idle" | "recording" | "transcribing" | "responding" | "speaking";

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
  confidence?: number;
};

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
};

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: ((this: BrowserSpeechRecognition, ev: Event) => unknown) | null;
  onerror: ((this: BrowserSpeechRecognition, ev: BrowserSpeechRecognitionErrorEvent) => unknown) | null;
  onresult: ((this: BrowserSpeechRecognition, ev: BrowserSpeechRecognitionEvent) => unknown) | null;
  onstart: ((this: BrowserSpeechRecognition, ev: Event) => unknown) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

const getSupportedMimeType = () => MIME_TYPES.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) ?? "";

const getSpeechRecognitionConstructor = () => window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

const getSpeechLocale = (language: "en" | "hi") => (language === "hi" ? "hi-IN" : "en-IN");

const chunkTextForSpeech = (text: string) => {
  const clean = text
    .replace(/\*\*/g, "")
    .replace(/#{1,}/g, "")
    .replace(/`/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return [];

  const sentences = clean.split(/(?<=[.!?।])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > 220 && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
};

const normalizeChatMessage = (
  message: Partial<ChatMessage> & { content?: unknown; role?: unknown; sources?: unknown },
): ChatMessage => ({
  role: message.role === "assistant" ? "assistant" : "user",
  content: typeof message.content === "string" ? message.content : "",
  sources: message.sources && typeof message.sources === "object" ? (message.sources as ChatSources) : null,
});

const getMatchedSchemes = (sources: ChatSources | null | undefined) =>
  Array.isArray(sources?.matchedSchemes) ? sources.matchedSchemes : [];

const AIChat = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [draft, setDraft] = useState("");
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionTranscriptRef = useRef("");
  const recognitionManualStopRef = useRef(false);
  const recognitionFallbackTriedRef = useRef(false);
  const mountedRef = useRef(true);

  const { data: sessions = [] } = useChatSessions();
  const { data: storedMessages = [] } = useChatMessages(activeSessionId);
  const { data: catalogSchemes = [] } = useSchemes();
  const createSession = useCreateSession();
  const sendMessageMutation = useSendMessage();

  const displayMessages = useMemo(
    () =>
      activeSessionId
        ? (storedMessages as Array<Partial<ChatMessage>>).map((message) => normalizeChatMessage(message))
        : localMessages.map((message) => normalizeChatMessage(message)),
    [activeSessionId, localMessages, storedMessages],
  );

  const speechRecognitionSupported = useMemo(
    () => typeof window !== "undefined" && Boolean(getSpeechRecognitionConstructor()),
    [],
  );
  const mediaRecordingSupported = useMemo(
    () => typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
    [],
  );

  const isBusy = voiceState === "transcribing" || voiceState === "responding";
  const isRecording = voiceState === "recording";
  const isSpeaking = voiceState === "speaking";

  const getAuthHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? PUBLISHABLE_KEY;

    return {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setVoiceState((current) => (current === "speaking" ? "idle" : current));
  }, []);

  const cleanupRecorder = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const cleanupSpeechRecognition = useCallback(() => {
    const recognition = speechRecognitionRef.current;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    }

    speechRecognitionRef.current = null;
    recognitionTranscriptRef.current = "";
    recognitionManualStopRef.current = false;
    recognitionFallbackTriedRef.current = false;
  }, []);

  const stopVoiceCapture = useCallback(() => {
    const recognition = speechRecognitionRef.current;
    if (recognition) {
      cleanupSpeechRecognition();
      try {
        recognition.abort();
      } catch {
        // noop
      }
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      recorder.stop();
    }

    cleanupRecorder();
    setVoiceState("idle");
  }, [cleanupRecorder, cleanupSpeechRecognition]);

  const speakText = useCallback(
    (text: string) => {
      if (!speakerEnabled || !window.speechSynthesis) {
        setVoiceState("idle");
        return;
      }

      const chunks = chunkTextForSpeech(text);
      if (!chunks.length) {
        setVoiceState("idle");
        return;
      }

      window.speechSynthesis.cancel();

      const getVoiceForLanguage = () => {
        const voices = window.speechSynthesis.getVoices();
        if (language === "hi") {
          const hiPrefixes = ["hi-IN", "hi_IN", "hi"];
          return (
            voices.find((voice) => hiPrefixes.some((prefix) => voice.lang.startsWith(prefix))) ??
            voices.find((voice) => voice.lang.startsWith("en-IN")) ??
            null
          );
        }

        const enPrefixes = ["en-IN", "en-US", "en-GB", "en"];
        return voices.find((voice) => enPrefixes.some((prefix) => voice.lang.startsWith(prefix))) ?? null;
      };

      const selectedVoice = getVoiceForLanguage();
      const targetLang = getSpeechLocale(language);

      const speakNext = (index: number) => {
        if (index >= chunks.length || !mountedRef.current) {
          setVoiceState("idle");
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.lang = targetLang;
        utterance.rate = language === "hi" ? 0.9 : 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => {
          if (mountedRef.current) setVoiceState("speaking");
        };

        utterance.onend = () => {
          speakNext(index + 1);
        };

        utterance.onerror = (event) => {
          if (event.error === "interrupted" || event.error === "canceled") {
            setVoiceState("idle");
            return;
          }

          console.warn("Speech synthesis error:", event.error);
          setVoiceState("idle");
          if (event.error !== "interrupted") {
            toast.error(language === "hi" ? "वॉइस आउटपुट शुरू नहीं हो पाया" : "Voice output could not start");
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext(0);
    },
    [language, speakerEnabled],
  );

  const parseAssistantResponse = useCallback(async (response: Response) => {
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

    if (contentType.includes("application/json")) {
      const data = await response.json().catch(() => ({}));
      return String(data.text ?? "").trim();
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";

      for (const rawLine of parts) {
        const line = rawLine.trim();
        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            if (mountedRef.current) setStreamingContent(fullContent);
          }
        } catch {
          // noop
        }
      }
    }

    return fullContent.trim();
  }, []);

  const fetchAssistantReply = useCallback(
    async (messages: ChatMessage[], schemeCatalog: MatchedScheme[]) => {
      const headers = await getAuthHeaders();
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.map((message) => ({ role: message.role, content: message.content })),
          language,
          schemeCatalog,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || (language === "hi" ? "सहायक से उत्तर नहीं मिला" : "Assistant response failed"));
      }

      return parseAssistantResponse(response);
    },
    [getAuthHeaders, language, parseAssistantResponse],
  );

  const sendChatMessage = useCallback(
    async (text: string, options?: { bypassBusyCheck?: boolean }) => {
      const userText = text.trim();
      if (!userText || (!options?.bypassBusyCheck && isBusy)) return;

      stopSpeaking();
      setDraft("");
      setVoiceState("responding");
      setStreamingContent("");

      const currentMessages = displayMessages.map((message) => ({ role: message.role, content: message.content } as ChatMessage));
      const pendingMessages = [...currentMessages, { role: "user", content: userText } as ChatMessage];
      const schemeCatalog = findRelevantSchemes(
        catalogSchemes,
        pendingMessages.map((message) => message.content).join(" "),
        8,
      );

      if (!user) {
        setLocalMessages((prev) => [...prev, { role: "user", content: userText }]);

        try {
          const assistantText = await fetchAssistantReply(pendingMessages, schemeCatalog);
          if (!assistantText) throw new Error(language === "hi" ? "उत्तर खाली है" : "Empty response");
          const matchedSchemes = findRelevantSchemes(catalogSchemes, `${userText} ${assistantText}`, 3);
          setLocalMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: assistantText,
              sources: matchedSchemes.length > 0 ? { matchedSchemes } : null,
            },
          ]);
          setStreamingContent("");
          speakText(assistantText);
        } catch (error) {
          setStreamingContent("");
          setVoiceState("idle");
          toast.error(error instanceof Error ? error.message : language === "hi" ? "चैट विफल रही" : "Chat failed");
        }

        return;
      }

      try {
        let sessionId = activeSessionId;
        if (!sessionId) {
          const newSession = await createSession.mutateAsync(userText.slice(0, 50));
          sessionId = newSession.id;
          setActiveSessionId(newSession.id);
        }

        await sendMessageMutation.mutateAsync({ sessionId: sessionId!, content: userText, role: "user" });
        const assistantText = await fetchAssistantReply(pendingMessages, schemeCatalog);
        if (!assistantText) throw new Error(language === "hi" ? "उत्तर खाली है" : "Empty response");
        const matchedSchemes = findRelevantSchemes(catalogSchemes, `${userText} ${assistantText}`, 3);
        await sendMessageMutation.mutateAsync({
          sessionId: sessionId!,
          content: assistantText,
          role: "assistant",
          sources: matchedSchemes.length > 0 ? { matchedSchemes } : undefined,
        });
        setStreamingContent("");
        speakText(assistantText);
      } catch (error) {
        setStreamingContent("");
        setVoiceState("idle");
        toast.error(error instanceof Error ? error.message : language === "hi" ? "चैट विफल रही" : "Chat failed");
      }
    },
    [activeSessionId, catalogSchemes, createSession, displayMessages, fetchAssistantReply, isBusy, language, sendMessageMutation, speakText, stopSpeaking, user],
  );

  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      setVoiceState("transcribing");

      try {
        const extension = audioBlob.type.includes("ogg") ? "ogg" : audioBlob.type.includes("mp4") ? "mp4" : "webm";
        const formData = new FormData();
        formData.append("file", new File([audioBlob], `voice-input.${extension}`, { type: audioBlob.type || "audio/webm" }));
        formData.append("language", language);

        const data = await invokeFormDataEdgeFunction<{ text?: string }>(
          "transcribe-audio",
          TRANSCRIBE_URL,
          formData,
          getAuthHeaders,
          language === "hi" ? "ऑडियो ट्रांसक्रिप्शन विफल रहा." : "Audio transcription failed.",
        );

        const transcript = String(data.text ?? "").trim();
        if (!transcript) {
          setVoiceState("idle");
          toast.error(language === "hi" ? "कोई आवाज़ समझ में नहीं आई" : "No speech detected");
          return;
        }

        setDraft(transcript);
        await sendChatMessage(transcript, { bypassBusyCheck: true });
      } catch (error) {
        setVoiceState("idle");
        toast.error(error instanceof Error ? error.message : language === "hi" ? "वॉइस प्रोसेस नहीं हुई" : "Voice processing failed");
      }
    },
    [getAuthHeaders, language, sendChatMessage],
  );

  const startMediaRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(language === "hi" ? "इस ब्राउज़र में वॉइस रिकॉर्डिंग समर्थित नहीं है" : "Voice recording is not supported in this browser");
      return;
    }

    try {
      stopSpeaking();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        cleanupRecorder();
        setVoiceState("idle");
        toast.error(language === "hi" ? "रिकॉर्डिंग शुरू नहीं हो सकी" : "Recording could not start");
      };

      recorder.onstop = async () => {
        const blobType = audioChunksRef.current[0]?.type || mimeType || "audio/webm";
        const finalBlob = new Blob(audioChunksRef.current, { type: blobType });
        cleanupRecorder();

        if (!finalBlob.size) {
          setVoiceState("idle");
          toast.error(language === "hi" ? "रिकॉर्डिंग खाली रही" : "Recording was empty");
          return;
        }

        await transcribeAudio(finalBlob);
      };

      recorder.start(250);
      setVoiceState("recording");
    } catch {
      cleanupRecorder();
      setVoiceState("idle");
      toast.error(language === "hi" ? "माइक्रोफोन की अनुमति दें" : "Please allow microphone access");
    }
  }, [cleanupRecorder, language, stopSpeaking, transcribeAudio]);

  const startSpeechRecognition = useCallback(async () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return false;

    try {
      stopSpeaking();
      const recognition = new SpeechRecognition();
      speechRecognitionRef.current = recognition;
      recognitionTranscriptRef.current = "";
      recognitionManualStopRef.current = false;

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = getSpeechLocale(language);

      recognition.onstart = () => {
        setVoiceState("recording");
      };

      recognition.onresult = (event) => {
        let transcript = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const alternative = event.results[index]?.[0];
          if (alternative?.transcript) {
            transcript += `${alternative.transcript} `;
          }
        }

        recognitionTranscriptRef.current = transcript.trim();
        if (recognitionTranscriptRef.current) {
          setDraft(recognitionTranscriptRef.current);
        }
      };

      recognition.onerror = async (event) => {
        const errorCode = event.error;
        cleanupSpeechRecognition();
        setVoiceState("idle");

        if (errorCode === "aborted") return;

        if ((errorCode === "language-not-supported" || errorCode === "service-not-allowed" || errorCode === "network") && mediaRecordingSupported) {
          recognitionFallbackTriedRef.current = true;
          await startMediaRecording();
          return;
        }

        if (errorCode === "no-speech") {
          toast.error(language === "hi" ? "कोई आवाज़ समझ में नहीं आई" : "No speech detected");
          return;
        }

        if (errorCode === "not-allowed" || errorCode === "audio-capture") {
          if (mediaRecordingSupported && !recognitionFallbackTriedRef.current) {
            recognitionFallbackTriedRef.current = true;
            await startMediaRecording();
            return;
          }
          toast.error(language === "hi" ? "माइक्रोफोन की अनुमति दें" : "Please allow microphone access");
          return;
        }

        if (mediaRecordingSupported && !recognitionFallbackTriedRef.current) {
          recognitionFallbackTriedRef.current = true;
          await startMediaRecording();
          return;
        }

        toast.error(language === "hi" ? "वॉइस इनपुट शुरू नहीं हो पाया" : "Voice input could not start");
      };

      recognition.onend = async () => {
        const transcript = recognitionTranscriptRef.current.trim();
        const stoppedManually = recognitionManualStopRef.current;
        cleanupSpeechRecognition();

        if (!transcript) {
          setVoiceState("idle");
          if (!stoppedManually) {
            toast.error(language === "hi" ? "कोई आवाज़ समझ में नहीं आई" : "No speech detected");
          }
          return;
        }

        setVoiceState("transcribing");
        await sendChatMessage(transcript, { bypassBusyCheck: true });
      };

      recognition.start();
      return true;
    } catch {
      cleanupSpeechRecognition();
      return false;
    }
  }, [cleanupSpeechRecognition, language, mediaRecordingSupported, sendChatMessage, startMediaRecording, stopSpeaking]);

  const stopRecording = useCallback(() => {
    const recognition = speechRecognitionRef.current;
    if (recognition) {
      recognitionManualStopRef.current = true;
      try {
        recognition.stop();
      } catch {
        cleanupSpeechRecognition();
        setVoiceState("idle");
      }
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupRecorder();
      setVoiceState("idle");
    }
  }, [cleanupRecorder, cleanupSpeechRecognition]);

  const startRecording = useCallback(async () => {
    if (speechRecognitionSupported) {
      const started = await startSpeechRecognition();
      if (started) return;
    }

    if (mediaRecordingSupported) {
      await startMediaRecording();
      return;
    }

    toast.error(language === "hi" ? "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है" : "Voice input is not available in this browser");
  }, [language, mediaRecordingSupported, speechRecognitionSupported, startMediaRecording, startSpeechRecognition]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (!isBusy) void startRecording();
  }, [isBusy, isRecording, startRecording, stopRecording]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, streamingContent, voiceState]);

  useEffect(() => {
    mountedRef.current = true;

    // Browsers load voices asynchronously; trigger load and listen for the event.
    const loadVoices = () => {
      window.speechSynthesis?.getVoices();
    };

    loadVoices();

    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }

    return () => {
      mountedRef.current = false;
      stopSpeaking();
      stopVoiceCapture();
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      }
    };
  }, [stopSpeaking, stopVoiceCapture]);

  const statusLabel =
    voiceState === "recording"
      ? language === "hi"
        ? "रिकॉर्डिंग चालू है"
        : "Recording"
      : voiceState === "transcribing"
        ? language === "hi"
          ? "आवाज़ को टेक्स्ट में बदला जा रहा है"
          : "Transcribing"
        : voiceState === "responding"
          ? language === "hi"
            ? "सहायक उत्तर तैयार कर रहा है"
            : "Generating reply"
          : voiceState === "speaking"
            ? language === "hi"
              ? "सहायक बोल रहा है"
              : "Speaking"
            : language === "hi"
              ? "वॉइस तैयार है"
              : "Voice ready";

  return (
    <div className="min-h-screen pt-20 flex">
      <aside className="hidden lg:flex flex-col w-56 min-h-[calc(100vh-5rem)] pt-6 pb-4 px-4 bg-surface-low">
        <h2 className="font-headline font-bold text-primary text-sm mb-4">{t("chat.title")}</h2>

        <div className="bg-surface-container rounded-xl p-4 ghost-border mb-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t("chat.speaker")}</span>
            <button
              type="button"
              onClick={() => {
                setSpeakerEnabled((current) => {
                  if (current) stopSpeaking();
                  return !current;
                });
              }}
              className={`w-10 h-5 rounded-full transition-colors relative ${speakerEnabled ? "bg-primary" : "bg-surface-highest"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-transform ${speakerEnabled ? "left-5" : "left-0.5"}`} />
            </button>
          </div>

          <div className="rounded-lg bg-surface-high p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">{language === "hi" ? "स्थिति" : "Status"}</p>
            <p className="text-sm font-medium">{statusLabel}</p>
          </div>
        </div>

        {user && (
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              stopVoiceCapture();
              setActiveSessionId(null);
              setLocalMessages([]);
              setStreamingContent("");
              setDraft("");
            }}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium gradient-primary text-primary-foreground mb-4"
          >
            <Plus className="w-4 h-4" /> {t("chat.newChat")}
          </button>
        )}

        {user && sessions.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-3">{t("chat.recentSessions")}</p>
            <div className="space-y-1">
              {sessions.slice(0, 5).map((session: any) => (
                <button
                  type="button"
                  key={session.id}
                  onClick={() => {
                    stopSpeaking();
                    stopVoiceCapture();
                    setActiveSessionId(session.id);
                    setStreamingContent("");
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all truncate ${activeSessionId === session.id ? "bg-surface-highest text-primary" : "text-on-surface-variant hover:text-foreground hover:bg-surface-container"}`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{session.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!user && (
          <Link to="/auth" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium gradient-primary text-primary-foreground mb-4 justify-center">
            <LogIn className="w-4 h-4" /> {t("chat.signInSave")}
          </Link>
        )}

        <div className="mt-auto bg-surface-container rounded-xl p-4 ghost-border">
          <div className="flex items-center gap-2 mb-2">
            {speakerEnabled ? <Volume2 className="w-4 h-4 text-accent" /> : <VolumeX className="w-4 h-4 text-on-surface-variant" />}
            <span className="text-xs font-bold uppercase tracking-wider text-accent">{t("chat.trustScore")}</span>
          </div>
          <p className="text-xs text-on-surface-variant italic">{t("chat.ragNote")}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 max-w-3xl mx-auto w-full">
          {displayMessages.length === 0 && !streamingContent && voiceState !== "responding" && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Sparkles className="w-12 h-12 text-primary mb-4" />
              <h2 className="font-headline font-bold text-2xl mb-2">{t("chat.title")}</h2>
              <p className="text-on-surface-variant max-w-md mb-8">{t("chat.emptyDesc")}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {[t("chat.askSchemes"), t("chat.askStartup"), t("chat.askEligibility")].map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    onClick={() => setDraft(prompt)}
                    className="ghost-border px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:text-foreground hover:bg-surface-container transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {displayMessages.map((message, index) => (
            <motion.div key={`${message.role}-${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mb-6 ${message.role === "user" ? "flex justify-end" : ""}`}>
              {message.role === "user" ? (
                <div className="bg-surface-highest rounded-2xl rounded-br-md px-5 py-3 max-w-lg ghost-border">
                  <p className="text-sm">{message.content}</p>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="max-w-xl">
                    <div className="prose prose-sm prose-invert">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    {getMatchedSchemes(message.sources).length > 0 && (
                      <div className="mt-4 grid gap-3">
                        {getMatchedSchemes(message.sources).map((scheme) => (
                          <Link
                            key={scheme.id}
                            to={`/schemes/${scheme.id}`}
                            className="block rounded-2xl bg-surface-container px-4 py-4 ghost-border hover:bg-surface-high transition-colors"
                          >
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent">
                                {scheme.category}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                                {scheme.state}
                              </span>
                            </div>
                            <p className="font-headline font-bold text-base mb-1">{scheme.title}</p>
                            <p className="text-sm text-on-surface-variant line-clamp-2 mb-2">{scheme.description}</p>
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-accent font-semibold">{scheme.max_benefit || scheme.benefit_type}</span>
                              <span className="text-primary font-medium">{t("common.viewDetails")}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {streamingContent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="max-w-xl prose prose-sm prose-invert">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div layout className="my-6 rounded-2xl ghost-border bg-surface-container px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">{language === "hi" ? "वॉइस सहायक" : "Voice assistant"}</p>
                <p className="text-sm font-medium">{statusLabel}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {mediaRecordingSupported
                    ? language === "hi"
                      ? "ऑडियो रिकॉर्डिंग और ट्रांसक्रिप्शन सक्रिय है"
                      : "Audio recording and transcription are active"
                    : speechRecognitionSupported
                    ? language === "hi"
                      ? "ब्राउज़र स्पीच इनपुट सक्रिय है"
                      : "Browser speech input is active"
                    : language === "hi"
                      ? "वॉइस इनपुट उपलब्ध नहीं है"
                      : "Voice input is unavailable"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="h-10 w-10 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors flex items-center justify-center"
                    title={language === "hi" ? "बोलना बंद करें" : "Stop speaking"}
                  >
                    <Square className="w-4 h-4" fill="currentColor" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={isBusy}
                  className={`h-12 w-12 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${isRecording ? "bg-destructive text-destructive-foreground animate-pulse" : "gradient-primary text-primary-foreground hover:opacity-90"}`}
                  title={isRecording ? (language === "hi" ? "रिकॉर्डिंग बंद करें" : "Stop recording") : (language === "hi" ? "रिकॉर्डिंग शुरू करें" : "Start recording")}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>

          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 glass-panel px-6 md:px-10 py-4">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendChatMessage(draft);
                }
              }}
              placeholder={language === "hi" ? "अपना सवाल लिखें या माइक दबाकर बोलें..." : "Type your question or press the mic to speak..."}
              className="flex-1 bg-transparent text-foreground placeholder:text-on-surface-variant text-sm focus:outline-none"
            />

            <button
              type="button"
              onClick={toggleRecording}
              disabled={isBusy}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${isRecording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-surface-highest text-on-surface-variant hover:text-foreground"}`}
              title={isRecording ? (language === "hi" ? "रिकॉर्डिंग बंद करें" : "Stop recording") : (language === "hi" ? "रिकॉर्डिंग शुरू करें" : "Start recording")}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/20 text-destructive hover:bg-destructive/30 transition-all"
                title={t("chat.stopSpeaking")}
              >
                <Square className="w-4 h-4" fill="currentColor" />
              </button>
            )}

            <button
              type="button"
              onClick={() => void sendChatMessage(draft)}
              disabled={isBusy || !draft.trim()}
              className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIChat;
