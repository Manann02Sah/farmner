import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Leaf, Loader2, ScanSearch, ShieldAlert, SquareActivity } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFarmerProfile } from "@/hooks/useFarmerProfile";
import { useSchemes } from "@/hooks/useSchemes";
import { buildProfileSearchText } from "@/lib/copilot";
import { findRelevantSchemes } from "@/lib/schemeMatching";

type ZoneStatus = "safe" | "warning" | "disease";

type OverlayZone = {
  x: number;
  y: number;
  width: number;
  height: number;
  status: ZoneStatus;
};

type AnalysisMetrics = {
  safePct: number;
  warningPct: number;
  diseasePct: number;
  leafCoveragePct: number;
  hydrationScore: number;
  pestRiskScore: number;
  zones: OverlayZone[];
};

const GRID_COLUMNS = 8;
const GRID_ROWS = 6;
const ANALYSIS_WIDTH = 160;
const ANALYSIS_HEIGHT = 120;

const defaultMetrics: AnalysisMetrics = {
  safePct: 0,
  warningPct: 0,
  diseasePct: 0,
  leafCoveragePct: 0,
  hydrationScore: 0,
  pestRiskScore: 0,
  zones: [],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const CropHealthScanner = () => {
  const { language } = useLanguage();
  const { profile } = useFarmerProfile(language);
  const { data: schemes = [] } = useSchemes();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "live">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AnalysisMetrics>(defaultMetrics);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [lastCaptureAt, setLastCaptureAt] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      language === "hi"
        ? {
            title: "फसल स्वास्थ्य स्कैन",
            subtitle: "कैमरा खोलें, पौधे को फ्रेम में रखें, फिर Click Image दबाकर रिपोर्ट बनाएं।",
            openCamera: "कैमरा खोलें",
            stopCamera: "कैमरा बंद करें",
            capture: "Click Image",
            restarting: "कैमरा शुरू हो रहा है...",
            unavailable: "इस ब्राउज़र में कैमरा उपलब्ध नहीं है।",
            permission: "कृपया कैमरा अनुमति दें और फिर प्रयास करें।",
            summaryTitle: "फसल रिपोर्ट और अगले कदम",
            summaryEmpty: "पहले कैमरा खोलें, फिर Click Image दबाकर रिपोर्ट बनाएं।",
            matchedSchemes: "उपयुक्त योजनाएं",
            noSchemes: "अभी कोई साफ योजना मैच नहीं मिला।",
            overlayHint: "रिपोर्ट केवल फोटो क्लिक करने के बाद अपडेट होगी।",
            safe: "सुरक्षित",
            warning: "जोखिम",
            disease: "रोगग्रस्त",
            hydration: "नमी स्कोर",
            pestRisk: "रोग/कीट जोखिम",
            leafCoverage: "लीफ कवरेज",
            statusCard: "अंतिम स्कैन",
            openDetails: "विवरण खोलें",
            capturePrompt: "रिपोर्ट बनाने के लिए पत्तियों पर कैमरा फोकस करें और फोटो लें।",
            capturedAt: "अंतिम फोटो",
          }
        : {
            title: "Crop Health Scan",
            subtitle: "Open the camera, frame the plant clearly, then press Click Image to generate the report.",
            openCamera: "Open Camera",
            stopCamera: "Stop Camera",
            capture: "Click Image",
            restarting: "Starting camera...",
            unavailable: "Camera is not available in this browser.",
            permission: "Please allow camera access and try again.",
            summaryTitle: "Crop report and next steps",
            summaryEmpty: "Open the camera, then press Click Image to generate the report.",
            matchedSchemes: "Relevant schemes",
            noSchemes: "No clear scheme match yet.",
            overlayHint: "The report updates only after you click an image.",
            safe: "Safe",
            warning: "At Risk",
            disease: "Diseased",
            hydration: "Hydration score",
            pestRisk: "Disease/pest risk",
            leafCoverage: "Leaf coverage",
            statusCard: "Latest scan",
            openDetails: "Open details",
            capturePrompt: "Point the camera at the leaves and take a photo to generate the report.",
            capturedAt: "Last image",
          },
    [language],
  );

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    const overlayCanvas = overlayRef.current;
    if (overlayCanvas) {
      const context = overlayCanvas.getContext("2d");
      context?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    setCameraState("idle");
  };

  useEffect(() => stopCamera, []);

  const getStatusStyle = (status: ZoneStatus) => {
    switch (status) {
      case "disease":
        return { stroke: "#ef4444", fill: "rgba(239,68,68,0.16)" };
      case "warning":
        return { stroke: "#facc15", fill: "rgba(250,204,21,0.16)" };
      default:
        return { stroke: "#22c55e", fill: "rgba(34,197,94,0.12)" };
    }
  };

  const drawOverlay = (nextMetrics: AnalysisMetrics) => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) return;

    const width = video.clientWidth;
    const height = video.clientHeight;
    if (!width || !height) return;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.lineWidth = 2;

    nextMetrics.zones.forEach((zone) => {
      const { stroke, fill } = getStatusStyle(zone.status);
      const x = zone.x * width;
      const y = zone.y * height;
      const zoneWidth = zone.width * width;
      const zoneHeight = zone.height * height;

      context.fillStyle = fill;
      context.strokeStyle = stroke;
      context.fillRect(x, y, zoneWidth, zoneHeight);
      context.strokeRect(x, y, zoneWidth, zoneHeight);
    });
  };

  const captureAndAnalyze = () => {
    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    canvas.width = ANALYSIS_WIDTH;
    canvas.height = ANALYSIS_HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
    const imageData = context.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
    const pixels = imageData.data;
    const cellWidth = ANALYSIS_WIDTH / GRID_COLUMNS;
    const cellHeight = ANALYSIS_HEIGHT / GRID_ROWS;

    let safeLeafPixels = 0;
    let warningLeafPixels = 0;
    let diseaseLeafPixels = 0;
    let totalLeafPixels = 0;
    const zones: OverlayZone[] = [];

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLUMNS; col += 1) {
        let safeCount = 0;
        let warningCount = 0;
        let diseaseCount = 0;
        let leafCount = 0;

        for (let y = Math.floor(row * cellHeight); y < Math.floor((row + 1) * cellHeight); y += 1) {
          for (let x = Math.floor(col * cellWidth); x < Math.floor((col + 1) * cellWidth); x += 1) {
            const index = (y * ANALYSIS_WIDTH + x) * 4;
            const red = pixels[index];
            const green = pixels[index + 1];
            const blue = pixels[index + 2];
            const brightness = (red + green + blue) / 3;
            const isLeaf = green > 50 && green >= red * 0.75 && green >= blue * 0.8;

            if (!isLeaf) continue;

            leafCount += 1;
            totalLeafPixels += 1;

            const yellowish = red > 80 && green > 80 && Math.abs(red - green) < 45;
            const diseased = red > green * 1.08 || brightness < 55;
            const stressed = yellowish || brightness < 85 || green < 95;

            if (diseased) {
              diseaseCount += 1;
              diseaseLeafPixels += 1;
            } else if (stressed) {
              warningCount += 1;
              warningLeafPixels += 1;
            } else {
              safeCount += 1;
              safeLeafPixels += 1;
            }
          }
        }

        if (leafCount < 20) continue;

        const dominantStatus: ZoneStatus =
          diseaseCount / leafCount > 0.28
            ? "disease"
            : warningCount / leafCount > 0.3
              ? "warning"
              : "safe";

        zones.push({
          x: col / GRID_COLUMNS,
          y: row / GRID_ROWS,
          width: 1 / GRID_COLUMNS,
          height: 1 / GRID_ROWS,
          status: dominantStatus,
        });
      }
    }

    const safePct = totalLeafPixels ? Math.round((safeLeafPixels / totalLeafPixels) * 100) : 0;
    const warningPct = totalLeafPixels ? Math.round((warningLeafPixels / totalLeafPixels) * 100) : 0;
    const diseasePct = totalLeafPixels ? Math.round((diseaseLeafPixels / totalLeafPixels) * 100) : 0;
    const leafCoveragePct = Math.round((totalLeafPixels / (ANALYSIS_WIDTH * ANALYSIS_HEIGHT)) * 100);
    const hydrationScore = clamp(Math.round(safePct - warningPct * 0.3 - diseasePct * 0.5 + leafCoveragePct * 0.2), 0, 100);
    const pestRiskScore = clamp(Math.round(diseasePct + warningPct * 0.5), 0, 100);

    const nextMetrics = {
      safePct,
      warningPct,
      diseasePct,
      leafCoveragePct,
      hydrationScore,
      pestRiskScore,
      zones,
    };

    setMetrics(nextMetrics);
    drawOverlay(nextMetrics);
    setSummaryVisible(true);
    setLastCaptureAt(new Date().toLocaleTimeString(language === "hi" ? "hi-IN" : "en-IN"));
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(copy.unavailable);
      return;
    }

    setCameraError(null);
    setCameraState("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("live");
    } catch (error) {
      console.error("crop scanner camera error:", error);
      setCameraState("idle");
      setCameraError(copy.permission);
    }
  };

  const summary = useMemo(() => {
    const recommendations: string[] = [];
    const schemeQuery: string[] = [];

    if (metrics.diseasePct >= 25) {
      recommendations.push(
        language === "hi"
          ? "लाल हिस्से ज्यादा हैं। प्रभावित पत्तियों को अलग करें, स्थानीय कृषि विशेषज्ञ से सलाह लें, और ऊपर से पानी देने से बचें।"
          : "Red zones are elevated. Isolate affected leaves, consult a local expert, and avoid overhead watering.",
      );
      schemeQuery.push("crop protection pest management agriculture subsidy");
    }

    if (metrics.warningPct >= 25) {
      recommendations.push(
        language === "hi"
          ? "पीले हिस्से तनाव दिखा रहे हैं। मिट्टी की नमी जांचें, सिंचाई का अंतराल संतुलित करें, और पोषण प्रबंधन पर ध्यान दें।"
          : "Yellow zones show stress. Check soil moisture, rebalance irrigation timing, and review plant nutrition.",
      );
      schemeQuery.push("micro irrigation soil health water support farmer scheme");
    }

    if (metrics.safePct >= 60) {
      recommendations.push(
        language === "hi"
          ? "हरी कवरेज अच्छी है। नियमित निरीक्षण, संतुलित पानी और कीट निगरानी जारी रखें।"
          : "Green coverage is strong. Continue regular inspection, balanced watering, and pest monitoring.",
      );
    }

    if (metrics.leafCoveragePct < 20) {
      recommendations.push(
        language === "hi"
          ? "फ्रेम में पत्तियां कम दिख रही हैं। अगली फोटो में पत्तियों के पास जाएं और रोशनी बेहतर रखें।"
          : "Leaf coverage in the frame is low. Move closer to the crop canopy and use better lighting on the next image.",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        language === "hi"
          ? "अभी बड़ा तनाव संकेत नहीं दिखा, फिर भी नमी, पत्तियों की सतह और कीट गतिविधि की नियमित जांच जारी रखें।"
          : "No major stress signal is visible right now, but keep checking moisture, leaf surfaces, and pest activity regularly.",
      );
    }

    const matchedSchemes = findRelevantSchemes(
      schemes,
      `${schemeQuery.join(" ")} ${buildProfileSearchText(profile)}`,
      3,
      { profile },
    );

    return {
      recommendations,
      matchedSchemes,
    };
  }, [language, metrics, profile, schemes]);

  const statCards = [
    {
      label: copy.safe,
      value: `${metrics.safePct}%`,
      color: "bg-green-500/15 text-green-400 border-green-500/30",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      label: copy.warning,
      value: `${metrics.warningPct}%`,
      color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      label: copy.disease,
      value: `${metrics.diseasePct}%`,
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: <ShieldAlert className="w-4 h-4" />,
    },
  ];

  return (
    <section className="bg-surface-container rounded-3xl p-6 md:p-8 ghost-border">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <h2 className="font-headline text-2xl font-bold">{copy.title}</h2>
          </div>
          <p className="max-w-3xl text-sm text-on-surface-variant">{copy.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={cameraState === "live" ? stopCamera : () => void startCamera()}
            className="gradient-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 font-headline font-bold text-primary-foreground"
          >
            {cameraState === "starting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {cameraState === "live" ? copy.stopCamera : cameraState === "starting" ? copy.restarting : copy.openCamera}
          </button>

          <button
            type="button"
            onClick={captureAndAnalyze}
            disabled={cameraState !== "live"}
            className="ghost-border inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-on-surface-variant transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ScanSearch className="h-4 w-4" />
            {copy.capture}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="relative min-h-[24rem] overflow-hidden rounded-3xl bg-surface-high">
            <video ref={videoRef} className="h-full min-h-[24rem] w-full object-cover" muted playsInline />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
            <canvas ref={analysisCanvasRef} className="hidden" />

            <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-black/55 px-4 py-3 text-white backdrop-blur">
                <p className="mb-1 text-[11px] uppercase tracking-wider text-white/70">{copy.statusCard}</p>
                <p className="text-sm font-medium">{lastCaptureAt ? `${copy.capturedAt}: ${lastCaptureAt}` : copy.overlayHint}</p>
              </div>

              {statCards.map((card) => (
                <div key={card.label} className={`rounded-2xl border px-4 py-3 backdrop-blur ${card.color}`}>
                  <div className="mb-1 flex items-center gap-2">
                    {card.icon}
                    <span className="text-[11px] uppercase tracking-wider">{card.label}</span>
                  </div>
                  <p className="text-lg font-bold">{card.value}</p>
                </div>
              ))}
            </div>

            {cameraState !== "live" && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-high p-6 text-center">
                <div>
                  <SquareActivity className="mx-auto mb-3 h-12 w-12 text-primary" />
                  <p className="mb-2 font-medium">{cameraState === "starting" ? copy.restarting : copy.openCamera}</p>
                  <p className="max-w-md text-sm text-on-surface-variant">{cameraError || copy.capturePrompt}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-surface-high p-4">
              <p className="mb-1 text-xs text-on-surface-variant">{copy.hydration}</p>
              <p className="font-headline text-2xl font-bold">{metrics.hydrationScore}%</p>
            </div>
            <div className="rounded-2xl bg-surface-high p-4">
              <p className="mb-1 text-xs text-on-surface-variant">{copy.pestRisk}</p>
              <p className="font-headline text-2xl font-bold">{metrics.pestRiskScore}%</p>
            </div>
            <div className="rounded-2xl bg-surface-high p-4">
              <p className="mb-1 text-xs text-on-surface-variant">{copy.leafCoverage}</p>
              <p className="font-headline text-2xl font-bold">{metrics.leafCoveragePct}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-surface-high p-5">
          <h3 className="mb-4 font-headline text-xl font-bold">{copy.summaryTitle}</h3>

          {summaryVisible ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {summary.recommendations.map((recommendation, index) => (
                  <div key={`${recommendation}-${index}`} className="rounded-2xl bg-background/40 p-4 text-sm text-on-surface-variant">
                    {recommendation}
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-3 text-[11px] uppercase tracking-wider text-on-surface-variant">{copy.matchedSchemes}</p>
                {summary.matchedSchemes.length > 0 ? (
                  <div className="space-y-3">
                    {summary.matchedSchemes.map((scheme) => (
                      <Link
                        key={scheme.id}
                        to={`/schemes/${scheme.id}`}
                        className="ghost-border block rounded-2xl bg-background/40 p-4 transition-colors hover:bg-background/60"
                      >
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                            {scheme.category}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            {scheme.state}
                          </span>
                        </div>
                        <p className="mb-1 font-headline text-base font-bold">{scheme.title}</p>
                        <p className="mb-2 line-clamp-2 text-sm text-on-surface-variant">{scheme.description}</p>
                        {scheme.recommendationContext?.whyMatched?.[0] && (
                          <p className="mb-2 text-xs text-accent">{scheme.recommendationContext.whyMatched[0]}</p>
                        )}
                        <span className="text-sm font-medium text-primary">{copy.openDetails}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">{copy.noSchemes}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-background/40 p-4 text-sm text-on-surface-variant">
              {copy.summaryEmpty}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CropHealthScanner;
