"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  ExternalLink,
  Globe,
  MapPin,
  RefreshCw,
  Upload,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import {
  getMyCompany,
  uploadCompanyLogo,
  upsertMyCompany,
} from "@/lib/company";
import { ApiClientError, getDisplayErrorMessage } from "@/lib/api";
import { isValidOptionalHttpUrl } from "@/lib/profileUtils";
import { translations } from "@/lib/translations";
import type { Company } from "@/types";
import CustomInput from "@/components/ui/CustomInput";
import CustomTextarea from "@/components/ui/CustomTextarea";
import CustomButton from "@/components/ui/CustomButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

interface CompanyFormState {
  name: string;
  industry: string;
  size: string;
  location: string;
  website: string;
  description: string;
}

const EMPTY_FORM: CompanyFormState = {
  name: "",
  industry: "",
  size: "",
  location: "",
  website: "",
  description: "",
};

function companyToForm(company: Company): CompanyFormState {
  return {
    name: company.name,
    industry: company.industry ?? "",
    size: company.size ?? "",
    location: company.location ?? "",
    website: company.website ?? "",
    description: company.description ?? "",
  };
}

interface CompanyFetchState {
  key: string;
  company: Company | null;
  error: string | null;
}

export default function CompanyPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const tco = translations[language].company;
  const tc = translations[language].common;
  const tp = translations[language].profile;
  const ta = translations[language].auth;

  const [retryTick, setRetryTick] = useState(0);
  const fetchKey =
    !authLoading && user?.role === "employer" ? `${user._id}:${retryTick}` : "";

  const [fetchState, setFetchState] = useState<CompanyFetchState>({
    key: "",
    company: null,
    error: null,
  });

  const [form, setForm] = useState<CompanyFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadingCompany = Boolean(fetchKey) && fetchState.key !== fetchKey;
  const company = fetchState.key === fetchKey ? fetchState.company : null;
  const fetchError = fetchState.key === fetchKey ? fetchState.error : null;

  useEffect(() => {
    if (!fetchKey) return;
    let cancelled = false;

    getMyCompany()
      .then((data) => {
        if (cancelled) return;
        setFetchState({ key: fetchKey, company: data.company, error: null });
        setForm(companyToForm(data.company));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 404) {
          setFetchState({ key: fetchKey, company: null, error: null });
          return;
        }
        setFetchState({
          key: fetchKey,
          company: null,
          error: getDisplayErrorMessage(err, tc.error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [fetchKey, tc.error]);

  const handleSave = async () => {
    const trimmedName = form.name.trim();
    if (trimmedName.length < 2) {
      toast.error(tco.nameTooShort);
      return;
    }

    if (!isValidOptionalHttpUrl(form.website)) {
      toast.error(tp.invalidUrl);
      return;
    }

    setSaving(true);
    try {
      const data = await upsertMyCompany({
        name: trimmedName,
        description: form.description.trim(),
        website: form.website.trim(),
        location: form.location.trim(),
        industry: form.industry.trim(),
        size: form.size.trim(),
      });
      setFetchState({ key: fetchKey, company: data.company, error: null });
      setForm(companyToForm(data.company));
      toast.success(tco.saveSuccess);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    const extOk = [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) =>
      lower.endsWith(ext)
    );
    const mimeOk = !file.type || ALLOWED_IMAGE_MIMES.has(file.type);

    if (!extOk || !mimeOk) {
      toast.error(tp.invalidImageFile);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(tp.fileTooLarge);
      event.target.value = "";
      return;
    }

    setUploadingLogo(true);
    try {
      const res = await uploadCompanyLogo(file);
      setFetchState({ key: fetchKey, company: res.company, error: null });
      toast.success(tco.logoUpdated);
    } catch (err) {
      toast.error(getDisplayErrorMessage(err, tc.error));
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  if (authLoading || loadingCompany) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto interactive-panel p-8 text-center space-y-4">
        <p className="text-muted-foreground">{tco.onlyEmployer}</p>
        <Link
          href="/login?redirect=/company"
          className="interactive-button inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          {ta.loginButton}
        </Link>
      </div>
    );
  }

  if (user.role !== "employer") {
    return (
      <div className="max-w-lg mx-auto interactive-panel p-8 text-center space-y-4">
        <p className="text-muted-foreground">{tco.onlyEmployer}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            {tc.backHome}
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="interactive-button inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
            >
              {tco.goAdmin}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4">
        <AlertCircle className="h-7 w-7 text-destructive mx-auto" />
        <p className="text-destructive font-medium">{fetchError}</p>
        <CustomButton
          variant="outline"
          onClick={() => setRetryTick((prev) => prev + 1)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {tc.retry}
        </CustomButton>
      </div>
    );
  }

  const websiteInvalid = !isValidOptionalHttpUrl(form.website);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {tco.title}
        </h1>
        <p className="text-sm text-muted-foreground">{tco.subtitle}</p>
      </header>

      {/* Logo Upload Card */}
      <div className="interactive-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {company?.logoUrl ? (
            <Image
              src={company.logoUrl}
              alt={company.name}
              width={72}
              height={72}
              unoptimized
              className="h-18 w-18 rounded-xl object-cover border border-border shrink-0"
            />
          ) : (
            <div className="h-18 w-18 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8" />
            </div>
          )}
          <div className="space-y-1 min-w-0">
            <h2 className="text-sm font-semibold">{tco.logoTitle}</h2>
            <p className="text-xs text-muted-foreground">
              {company ? company.name : tco.logoHint}
            </p>
          </div>
        </div>

        <label
          className={
            company
              ? "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3.5 py-2 text-xs font-medium hover:bg-secondary cursor-pointer transition-colors shrink-0 w-fit"
              : "inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3.5 py-2 text-xs font-medium text-muted-foreground opacity-60 cursor-not-allowed shrink-0 w-fit"
          }
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{uploadingLogo ? tco.uploadingLogo : tco.uploadLogo}</span>
          <input
            ref={logoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            disabled={!company || uploadingLogo}
            onChange={handleLogoChange}
            className="sr-only"
          />
        </label>
      </div>

      {/* Main Company Form */}
      <div className="interactive-panel p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CustomInput
            id="company-name"
            label={tco.name}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <CustomInput
            id="company-industry"
            label={tco.industry}
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            placeholder={tco.industryPlaceholder}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="company-size" className="text-sm font-medium">
              {tco.size}
            </label>
            <select
              id="company-size"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className="h-9 w-full rounded-md border border-border/60 bg-background/70 px-3 text-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">{tco.selectSize}</option>
              {COMPANY_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>

          <CustomInput
            id="company-location"
            label={tco.location}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder={tco.locationPlaceholder}
          />
        </div>

        <CustomInput
          id="company-website"
          label={tco.website}
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder={tco.websitePlaceholder}
          error={websiteInvalid ? tp.invalidUrl : undefined}
        />

        <CustomTextarea
          id="company-description"
          label={tco.description}
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={tco.descriptionPlaceholder}
        />

        <div className="flex justify-end pt-2">
          <CustomButton
            onClick={handleSave}
            loading={saving}
            disabled={saving || websiteInvalid}
          >
            {saving ? tco.saving : tco.saveButton}
          </CustomButton>
        </div>
      </div>

      {/* Live Preview Card */}
      {form.name.trim().length >= 2 && (
        <div className="interactive-panel p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tco.previewTitle}
          </h3>
          <div className="flex items-start gap-4">
            {company?.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt={form.name}
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
            )}
            <div className="space-y-1.5 min-w-0">
              <div className="font-semibold text-lg truncate">{form.name}</div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {form.industry && <span>{form.industry}</span>}
                {form.size && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {form.size}
                  </span>
                )}
                {form.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {form.location}
                  </span>
                )}
                {form.website && !websiteInvalid ? (
                  <a
                    href={form.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {form.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {tco.noWebsite}
                  </span>
                )}
              </div>
              {form.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 pt-1">
                  {form.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
