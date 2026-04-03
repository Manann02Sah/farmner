import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AIChat from "@/pages/AIChat";
import DocumentVerifier from "@/components/DocumentVerifier";
import DocumentConverter from "@/components/DocumentConverter";

const mockGetSession = vi.fn();
const mockToastError = vi.fn();
const mockInvoke = vi.fn();

const mockSchemes = [
  {
    id: "scheme-1",
    title: "Solar Pump Subsidy",
    description: "Subsidy support for farmers installing solar irrigation pumps.",
    category: "Agriculture",
    state: "Punjab",
    benefit_type: "Subsidies",
    max_benefit: "Up to Rs. 2 lakh",
    eligibility: "Farmers with cultivable land",
    website_url: "https://example.com/solar-pump",
    benefits: ["Solar pump support"],
    ministry: "Ministry of Agriculture",
    application_deadline: null,
    external_id: null,
    status: "active",
    created_at: "2025-01-01",
  },
];

const translations: Record<string, string> = {
  "chat.title": "AI Chat",
  "chat.speaker": "Speaker",
  "chat.trustScore": "Trust score",
  "chat.ragNote": "RAG note",
  "chat.emptyDesc": "Ask anything",
  "chat.askSchemes": "Ask schemes",
  "chat.askStartup": "Ask startup",
  "chat.askEligibility": "Ask eligibility",
  "chat.signInSave": "Sign in",
  "chat.stopSpeaking": "Stop speaking",
  "doc.title": "Document Verification",
  "doc.requiredDocs": "Required documents",
  "doc.confidence": "Confidence",
  "doc.reupload": "Re-upload",
  "doc.allVerified": "All verified",
  "doc.verifyFailed": "Verification failed",
  "doc.autoVerifyFail": "Auto verification failed",
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (key: string) => translations[key] ?? key,
  }),
}));

vi.mock("@/hooks/useChat", () => ({
  useChatSessions: () => ({ data: [] }),
  useChatMessages: () => ({ data: [] }),
  useCreateSession: () => ({ mutateAsync: vi.fn() }),
  useSendMessage: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

vi.mock("@/hooks/useSchemes", () => ({
  useSchemes: () => ({ data: mockSchemes, isLoading: false }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

class MockSpeechSynthesisUtterance {
  text: string;
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: unknown = null;
  onstart: ((event?: Event) => void) | null = null;
  onend: ((event?: Event) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);

  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onerror: (() => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(_stream: MediaStream, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? "audio/webm";
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice-sample"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

describe("voice and document flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockInvoke.mockResolvedValue({ data: null, error: null });

    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });

    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: vi.fn(),
        getVoices: vi.fn(() => []),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        speak: vi.fn((utterance: MockSpeechSynthesisUtterance) => {
          utterance.onstart?.();
          utterance.onend?.();
        }),
      },
    });

    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: undefined,
    });

    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: undefined,
    });

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder,
    });

    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });

    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/transcribe-audio")) {
          return Promise.resolve(
            new Response(JSON.stringify({ text: "Find me a subsidy" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }

        if (url.includes("/verify-document")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                status: "VERIFIED",
                confidence: 92,
                message: "OCR matched the Aadhaar fields.",
                extractedText: "Name: Ravi Kumar\nAadhaar: 1234 5678 9012",
                detectedFields: ["Name", "Aadhaar number"],
                missingFields: [],
                tips: [],
                ocrPerformed: true,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        if (url.includes("/convert-document")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                translatedText: "यह अनूदित दस्तावेज़ है।",
                originalText: "This is the source document.",
                detectedSourceLanguage: "English",
                warnings: [],
                ocrPerformed: true,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        if (url.includes("/chat")) {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{"content":"Here is your matched scheme."}}]}\n\n'),
              );
              controller.close();
            },
          });

          return Promise.resolve(
            new Response(stream, {
              status: 200,
              headers: { "Content-Type": "text/event-stream" },
            }),
          );
        }

        return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
      }),
    });

    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    Object.defineProperty(globalThis.URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:preview"),
    });
  });

  it("runs the voice flow from recording through transcription and chat reply", async () => {
    render(
      <MemoryRouter>
        <AIChat />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByTitle("Start recording")[0]);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    fireEvent.click(screen.getAllByTitle("Stop recording")[0]);

    await waitFor(() => {
      expect(screen.getByText("Find me a subsidy")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Here is your matched scheme.")).toBeInTheDocument();
    });

    expect(screen.getByText("Solar Pump Subsidy")).toBeInTheDocument();
    expect(mockToastError).not.toHaveBeenCalledWith("Voice input could not start");
  });

  it("uploads a real file to document verification and renders OCR results", async () => {
    render(
      <DocumentVerifier
        scheme={{ title: "Farmer Scheme", category: "Agriculture" } as never}
        onClose={vi.fn()}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["image-data"], "aadhaar.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    await waitFor(() => {
      const verifyCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([url]) =>
        String(url).includes("/verify-document"),
      );
      expect(verifyCall).toBeTruthy();
      const payload = JSON.parse(String(verifyCall?.[1]?.body ?? "{}"));
      expect(payload.documentType).toBe("Aadhaar Card");
      expect(payload.fileName).toBe("aadhaar.png");
      expect(payload.fileMimeType).toBe("image/png");
      expect(payload.fileBase64).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText("OCR matched the Aadhaar fields.")).toBeInTheDocument();
    });

    expect(screen.getByText("OCR")).toBeInTheDocument();
    expect(screen.getByText(/Aadhaar: 1234 5678 9012/)).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Aadhaar Card"))).toBeInTheDocument();
  });

  it("uploads a document for conversion and renders the translated output", async () => {
    render(<DocumentConverter />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["pdf-data"], "notice.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Convert document" }));

    await waitFor(() => {
      const convertCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([url]) =>
        String(url).includes("/convert-document"),
      );
      expect(convertCall).toBeTruthy();
      const payload = JSON.parse(String(convertCall?.[1]?.body ?? "{}"));
      expect(payload.sourceLanguage).toBe("en");
      expect(payload.targetLanguage).toBe("hi");
      expect(payload.fileName).toBe("notice.pdf");
      expect(payload.fileMimeType).toBe("application/pdf");
      expect(payload.fileBase64).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText("यह अनूदित दस्तावेज़ है।")).toBeInTheDocument();
    });

    expect(screen.getByText("Detected source language:")).toBeInTheDocument();
    expect(screen.getByText("Download text")).toBeInTheDocument();
  });
});
