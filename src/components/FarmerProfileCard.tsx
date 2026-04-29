import { FormEvent, useEffect, useState } from "react";
import { Loader2, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { FarmerProfile } from "@/lib/copilotTypes";

type FarmerProfileCardProps = {
  language: "en" | "hi";
  profile: FarmerProfile;
  isSaving?: boolean;
  title?: string;
  subtitle?: string;
  saveLabel?: string;
  onSave: (profile: Partial<FarmerProfile>) => Promise<unknown>;
};

const INCOME_BANDS = [
  "Below Rs. 1 lakh",
  "Rs. 1-3 lakh",
  "Rs. 3-5 lakh",
  "Above Rs. 5 lakh",
];

const BUSINESS_TYPES = [
  "Farmer",
  "Dairy",
  "Horticulture",
  "Agri Entrepreneur",
  "MSME",
  "Startup",
];

const CATEGORIES = ["General", "SC", "ST", "OBC", "Women-led", "Farmer Producer Group"];

const SAVED_CROP_OPTIONS = ["Wheat", "Rice", "Cotton", "Sugarcane", "Pulses", "Vegetables"];

const parseCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toCsv = (items: string[]) => items.join(", ");

const getCopy = (language: "en" | "hi") =>
  language === "hi"
    ? {
        title: "Farmer profile memory",
        subtitle: "Ye details save karne se eligibility aur recommendations zyada accurate hoti hain.",
        save: "Profile save karein",
        displayName: "Name",
        state: "State",
        location: "Location",
        category: "Category",
        landholding: "Landholding",
        cropType: "Primary crop",
        incomeBand: "Income band",
        businessType: "Business type",
        savedCrops: "Saved crops",
        saved: "Profile updated.",
      }
    : {
        title: "Farmer profile memory",
        subtitle: "Save reusable details once so eligibility checks and recommendations become more precise.",
        save: "Save profile",
        displayName: "Name",
        state: "State",
        location: "Location",
        category: "Category",
        landholding: "Landholding",
        cropType: "Primary crop",
        incomeBand: "Income band",
        businessType: "Business type",
        savedCrops: "Saved crops",
        saved: "Profile updated.",
      };

const baseInputClassName =
  "w-full rounded-xl border border-outline-variant/20 bg-surface-high px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const FarmerProfileCard = ({
  language,
  profile,
  isSaving,
  title,
  subtitle,
  saveLabel,
  onSave,
}: FarmerProfileCardProps) => {
  const copy = getCopy(language);
  const [draft, setDraft] = useState(profile);
  const [savedCropsText, setSavedCropsText] = useState(toCsv(profile.savedCrops));

  useEffect(() => {
    setDraft(profile);
    setSavedCropsText(toCsv(profile.savedCrops));
  }, [profile]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave({ ...draft, savedCrops: parseCsv(savedCropsText) });
    toast.success(copy.saved);
  };

  return (
    <section className="bg-surface-container rounded-3xl p-6 ghost-border">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <UserRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-headline font-bold text-xl">{title || copy.title}</h2>
          <p className="text-sm text-on-surface-variant mt-1">{subtitle || copy.subtitle}</p>
        </div>
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="text-sm">
          <span className="block text-on-surface-variant mb-2">{copy.displayName}</span>
          <input
            value={draft.displayName}
            onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
            className={baseInputClassName}
          />
        </label>

        <label className="text-sm">
          <span className="block text-on-surface-variant mb-2">{copy.state}</span>
          <input
            value={draft.state}
            onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))}
            className={baseInputClassName}
          />
        </label>

        <label className="text-sm">
          <span className="block text-on-surface-variant mb-2">{copy.location}</span>
          <input
            value={draft.location}
            onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
            className={baseInputClassName}
          />
        </label>

        <label className="text-sm">
          <span className="block text-on-surface-variant mb-2">{copy.category}</span>
          <select
            value={draft.category}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            className={baseInputClassName}
          >
            <option value="">Select</option>
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-on-surface-variant mb-2">{copy.landholding}</span>
          <input
            value={draft.landholding}
            onChange={(event) => setDraft((current) => ({ ...current, landholding: event.target.value }))}
            placeholder="2 acres / 1.5 hectares"
            className={baseInputClassName}
          />
        </label>

        <label className="text-sm">
          <span className="block text-on-surface-variant mb-2">{copy.cropType}</span>
          <input
            value={draft.cropType}
            onChange={(event) => setDraft((current) => ({ ...current, cropType: event.target.value }))}
            className={baseInputClassName}
          />
        </label>

        <label className="text-sm">
          <span className="block text-on-surface-variant mb-2">{copy.incomeBand}</span>
          <select
            value={draft.incomeBand}
            onChange={(event) => setDraft((current) => ({ ...current, incomeBand: event.target.value }))}
            className={baseInputClassName}
          >
            <option value="">Select</option>
            {INCOME_BANDS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-on-surface-variant mb-2">{copy.businessType}</span>
          <select
            value={draft.businessType}
            onChange={(event) => setDraft((current) => ({ ...current, businessType: event.target.value }))}
            className={baseInputClassName}
          >
            <option value="">Select</option>
            {BUSINESS_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm md:col-span-2">
          <span className="block text-on-surface-variant mb-2">{copy.savedCrops}</span>
          <input
            value={savedCropsText}
            onChange={(event) => setSavedCropsText(event.target.value)}
            placeholder={SAVED_CROP_OPTIONS.join(", ")}
            className={baseInputClassName}
          />
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="gradient-primary text-primary-foreground rounded-xl px-5 py-3 inline-flex items-center gap-2 font-medium disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveLabel || copy.save}
          </button>
        </div>
      </form>
    </section>
  );
};

export default FarmerProfileCard;
