import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Leaf, Loader2, RefreshCcw, ShieldAlert, SquareActivity } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSchemes } from "@/hooks/useSchemes";
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
  const { data: schemes = [] } = useSchemes();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "live">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AnalysisMetrics>(defaultMetrics);
  const [summaryVisible, setSummaryVisible] = useState(false);

  const copy = useMemo(
    () =>
      language === "hi"
        ? {
            title: "क्रॉप हेल्थ लाइव स्कैन",
            subtitle: "कैमरा खोलें और पत्तियों के तनाव, रोग जोखिम और सुरक्षित हिस्सों का लाइव ओवरले देखें।",
            openCamera: "कैमरा खोलें",
            stopCamera: "कैमरा बंद करें",
            continue: "सारांश बनाएँ",
            restarting: "कैमरा शुरू हो रहा है...",
            unavailable: "इस ब्राउज़र में कैमरा उपलब्ध नहीं है।",
            permission: "कृपया कैमरा अनुमति दें और फिर से प्रयास करें।",
            summaryTitle: "तुरंत सलाह और अगला कदम",
            summaryEmpty: "लाइव फ़ीड शुरू करें, फिर सारांश बनाने के लिए Continue दबाएँ।",
            matchedSchemes: "उपयुक्त योजनाएँ",
            noSchemes: "अभी कोई स्पष्ट योजना मैच नहीं मिला।",
            overlayHint: "लाइव स्टेटस / Live status",
            safe: "सुरक्षित",
            warning: "जोखिम",
            disease: "रोगग्रस्त",
            hydration: "नमी स्कोर",
            pestRisk: "रोग/कीट जोखिम",
            leafCoverage: "लीफ कवरेज",
            live: "लाइव विश्लेषण",
            openDetails: "विवरण खोलें",
          }
        : {
            title: "Crop Health Live Scan",
            subtitle: "Open the camera and see a live overlay for healthy leaf zones, warning areas, and disease risk.",
            openCamera: "Open Camera",
            stopCamera: "Stop Camera",
            continue: "Generate Summary",
            restarting: "Starting camera...",
            unavailable: "Camera is not available in this browser.",
            permission: "Please allow camera access and try again.",
            summaryTitle: "Instant advice and next steps",
            summaryEmpty: "Start the live feed, then press Continue to generate a summary.",
            matchedSchemes: "Relevant schemes",
            noSchemes: "No clear scheme match yet.",
            overlayHint: "Live status / लाइव स्टेटस",
            safe: "Safe",
            warning: "At Risk",
            disease: "Diseased",
            hydration: "Hydration score",
            pestRisk: "Disease/pest risk",
            leafCoverage: "Leaf coverage",
            live: "Live analysis",
            openDetails: "Open details",
          },
    [language],
  );

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

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
    if (!video || !canvas) {
      return;
    }

    const width = video.clientWidth;
    const height = video.clientHeight;
    if (!width || !height) {
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

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

  const classifyFrame = () => {
    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    canvas.width = ANALYSIS_WIDTH;
    canvas.height = ANALYSIS_HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

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

            if (!isLeaf) {
              continue;
            }

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

        if (leafCount < 20) {
          continue;
        }

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
  };

  const loopAnalysis = () => {
    classifyFrame();
    animationFrameRef.current = requestAnimationFrame(loopAnalysis);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(copy.unavailable);
      return;
    }

    setCameraError(null);
    setSummaryVisible(false);
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
      animationFrameRef.current = requestAnimationFrame(loopAnalysis);
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
          ? "लाल हिस्से अधिक हैं। प्रभावित पत्तियाँ अलग करें, फफूंदनाशी या उचित कीटनाशी पर कृषि विशेषज्ञ से सलाह लें, और ऊपर से पानी देने से बचें।"
          : "Red zones are elevated. Isolate affected leaves, consult a local expert on fungicide or pesticide use, and avoid overhead watering."
      );
      schemeQuery.push("crop protection pest management agriculture subsidy");
    }

    if (metrics.warningPct >= 25) {
      recommendations.push(
        language === "hi"
          ? "पीले हिस्से तनाव दिखा रहे हैं। मिट्टी की नमी जाँचें, सिंचाई का अंतराल संतुलित करें, और नाइट्रोजन/पोटाश आधारित पोषण की समीक्षा करें।"
          : "Yellow zones show stress. Check soil moisture, rebalance irrigation timing, and review nitrogen/potash nutrition."
      );
      schemeQuery.push("micro irrigation soil health water support farmer scheme");
    }

    if (metrics.safePct >= 60) {
      recommendations.push(
        language === "hi"
          ? "हरी कवरेज अच्छी है। नियमित निरीक्षण, संतुलित पानी, और कीट निगरानी जारी रखें।"
          : "Green coverage is strong. Continue regular inspection, balanced watering, and pest monitoring."
      );
    }

    if (metrics.leafCoveragePct < 20) {
      recommendations.push(
        language === "hi"
          ? "कैमरे में पत्ती कवरेज कम दिख रही है। पत्तियों के करीब जाएँ और अगली जाँच में बेहतर रोशनी रखें।"
          : "Leaf coverage in the frame is low. Move closer to the crop canopy and use better lighting on the next scan."
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        language === "hi"
          ? "अभी पर्याप्त तनाव संकेत नहीं दिखे। फिर भी मिट्टी की नमी, पत्तियों की सतह, और कीट गतिविधि की नियमित जाँच जारी रखें।"
          : "No major stress signal is visible right now, but keep checking moisture, leaf surfaces, and pest activity regularly."
      );
    }

    const matchedSchemes = findRelevantSchemes(schemes, schemeQuery.join(" "), 3);

    return {
      recommendations,
      matchedSchemes,
    };
  }, [language, metrics, schemes]);

  const statCards = [
    {
      label: `${copy.safe} / Safe`,
      value: `${metrics.safePct}%`,
      color: "bg-green-500/15 text-green-400 border-green-500/30",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      label: `${copy.warning} / Warning`,
      value: `${metrics.warningPct}%`,
      color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      label: `${copy.disease} / Diseased`,
      value: `${metrics.diseasePct}%`,
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: <ShieldAlert className="w-4 h-4" />,
    },
  ];

  return (
    <section className="bg-surface-container rounded-3xl p-6 md:p-8 ghost-border">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-5 h-5 text-primary" />
            <h2 className="font-headline font-bold text-2xl">{copy.title}</h2>
          </div>
          <p className="text-sm text-on-surface-variant max-w-3xl">{copy.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={cameraState === "live" ? stopCamera : () => void startCamera()}
            className="gradient-primary text-primary-foreground font-headline font-bold px-5 py-3 rounded-xl inline-flex items-center gap-2"
          >
            {cameraState === "starting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {cameraState === "live" ? copy.stopCamera : cameraState === "starting" ? copy.restarting : copy.openCamera}
          </button>

          <button
            type="button"
            onClick={() => setSummaryVisible(true)}
            className="ghost-border px-5 py-3 rounded-xl text-sm font-medium text-on-surface-variant hover:text-foreground inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            {copy.continue}
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-surface-high min-h-[24rem]">
            <video ref={videoRef} className="w-full h-full min-h-[24rem] object-cover" muted playsInline />
            <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            <canvas ref={analysisCanvasRef} className="hidden" />

            <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-black/55 px-4 py-3 text-white backdrop-blur">
                <p className="text-[11px] uppercase tracking-wider text-white/70 mb-1">{copy.live}</p>
                <p className="text-sm font-medium">{copy.overlayHint}</p>
              </div>

              {statCards.map((card) => (
                <div key={card.label} className={`rounded-2xl border px-4 py-3 backdrop-blur ${card.color}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {card.icon}
                    <span className="text-[11px] uppercase tracking-wider">{card.label}</span>
                  </div>
                  <p className="text-lg font-bold">{card.value}</p>
                </div>
              ))}
            </div>

            {cameraState !== "live" && (
              <div className="absolute inset-0 flex items-center justify-center text-center p-6 bg-surface-high">
                <div>
                  <SquareActivity className="w-12 h-12 text-primary mx-auto mb-3" />
                  <p className="font-medium mb-2">
                    {cameraState === "starting" ? copy.restarting : copy.openCamera}
                  </p>
                  <p className="text-sm text-on-surface-variant max-w-md">
                    {cameraError || copy.summaryEmpty}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-surface-high p-4">
              <p className="text-xs text-on-surface-variant mb-1">{copy.hydration}</p>
              <p className="text-2xl font-headline font-bold">{metrics.hydrationScore}%</p>
            </div>
            <div className="rounded-2xl bg-surface-high p-4">
              <p className="text-xs text-on-surface-variant mb-1">{copy.pestRisk}</p>
              <p className="text-2xl font-headline font-bold">{metrics.pestRiskScore}%</p>
            </div>
            <div className="rounded-2xl bg-surface-high p-4">
              <p className="text-xs text-on-surface-variant mb-1">{copy.leafCoverage}</p>
              <p className="text-2xl font-headline font-bold">{metrics.leafCoveragePct}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-surface-high p-5">
          <h3 className="font-headline font-bold text-xl mb-4">{copy.summaryTitle}</h3>

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
                <p className="text-[11px] uppercase tracking-wider text-on-surface-variant mb-3">{copy.matchedSchemes}</p>
                {summary.matchedSchemes.length > 0 ? (
                  <div className="space-y-3">
                    {summary.matchedSchemes.map((scheme) => (
                      <Link
                        key={scheme.id}
                        to={`/schemes/${scheme.id}`}
                        className="block rounded-2xl bg-background/40 p-4 ghost-border hover:bg-background/60 transition-colors"
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
                        <span className="text-sm text-primary font-medium">{copy.openDetails}</span>
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
