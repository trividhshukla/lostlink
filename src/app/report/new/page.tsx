"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  PlusCircle,
  Upload,
  Shield,
  AlertCircle,
  CheckCircle2,
  Info,
  Tag,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { createReportAction, checkPotentialDuplicateReportAction } from "@/lib/server/reports/actions";
import {
  CAMPUS_AREAS,
  CATEGORIES,
  REPORT_COLOURS,
  CampusArea,
  ReportColour,
} from "@/lib/constants";

function ReportFormContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "lost" ? "lost" : "found";

  const [reportType, setReportType] = useState<"lost" | "found">(initialType);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [colour, setColour] = useState<ReportColour | "">("");
  const [brand, setBrand] = useState("");
  const [distinctiveFeatures, setDistinctiveFeatures] = useState("");
  const [campusArea, setCampusArea] = useState<CampusArea | "">("");
  const [exactLocationNote, setExactLocationNote] = useState("");
  const [incidentDate, setIncidentDate] = useState("");

  // Photo state (Found ONLY)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicateTitle: string;
    duplicateId: string;
  } | null>(null);

  // Check for potential duplicate reports
  useEffect(() => {
    if (!title || title.trim().length < 4 || !category) {
      setDuplicateWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      const catIndex = CATEGORIES.findIndex((c) => c.label === category || c.slug === category);
      const catId = catIndex >= 0 ? catIndex + 1 : 1;
      const res = await checkPotentialDuplicateReportAction(reportType, catId, title);
      if (res.hasDuplicate && res.duplicateTitle && res.duplicateId) {
        setDuplicateWarning({
          duplicateTitle: res.duplicateTitle,
          duplicateId: res.duplicateId,
        });
      } else {
        setDuplicateWarning(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [title, category, reportType]);

  // Sync reportType with URL parameter if it changes
  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "lost" || type === "found") {
      setReportType(type);
    }
  }, [searchParams]);

  // Set default date to today's date format (YYYY-MM-DD)
  useEffect(() => {
    const now = new Date();
    const formatted = now.toISOString().split("T")[0];
    setIncidentDate(formatted);
  }, []);

  const isRestrictedCategory =
    CATEGORIES.find((c) => c.slug === category)?.photoVisibility === "restricted";

  // Contact info blocker regex (Phone or Email)
  const containsContactInfo = (text: string) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/;
    return emailRegex.test(text) || phoneRegex.test(text);
  };

  // Validation function
  const validateStep = (stepNumber: number) => {
    const newErrors: { [key: string]: string } = {};

    if (stepNumber === 1) {
      if (!title.trim() || title.trim().length < 3) {
        newErrors.title = "Title must be at least 3 characters.";
      } else if (title.trim().length > 100) {
        newErrors.title = "Title cannot exceed 100 characters.";
      } else if (containsContactInfo(title)) {
        newErrors.title = "Public fields cannot include email addresses or phone numbers.";
      }

      if (!description.trim() || description.trim().length < 10) {
        newErrors.description = "Description must be at least 10 characters.";
      } else if (description.trim().length > 1500) {
        newErrors.description = "Description cannot exceed 1500 characters.";
      } else if (containsContactInfo(description)) {
        newErrors.description = "Public fields cannot include email addresses or phone numbers.";
      }

      if (!category) {
        newErrors.category = "Please select an approved category.";
      }

      if (!colour) {
        newErrors.colour = "Please select a primary colour (or 'Not sure').";
      }

      if (brand && brand.length > 60) {
        newErrors.brand = "Brand/model cannot exceed 60 characters.";
      } else if (brand && containsContactInfo(brand)) {
        newErrors.brand = "Brand cannot include contact details.";
      }

      if (distinctiveFeatures && distinctiveFeatures.length > 300) {
        newErrors.distinctiveFeatures = "Distinctive features cannot exceed 300 characters.";
      } else if (distinctiveFeatures && containsContactInfo(distinctiveFeatures)) {
        newErrors.distinctiveFeatures = "Distinctive features cannot include contact details.";
      }
    }

    if (stepNumber === 2) {
      if (!campusArea) {
        newErrors.campusArea = "Please select a campus area.";
      }

      if (exactLocationNote && exactLocationNote.length > 120) {
        newErrors.exactLocationNote = "Exact location note cannot exceed 120 characters.";
      } else if (exactLocationNote && containsContactInfo(exactLocationNote)) {
        newErrors.exactLocationNote = "Location note cannot include contact details.";
      }

      if (!incidentDate) {
        newErrors.incidentDate = "Please choose the incident date.";
      } else {
        const selected = new Date(incidentDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selected > today) {
          newErrors.incidentDate = "Incident date cannot be in the future.";
        }
      }
    }

    if (stepNumber === 3 && reportType === "found") {
      if (!photoPreview && !photoFile) {
        newErrors.photo = "Exactly one photo is required for a Found report.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Format check (JPEG, PNG, WebP)
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          photo: "Only JPEG, PNG, or WebP images are accepted.",
        }));
        return;
      }

      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrors((prev) => {
        const rest = { ...prev };
        delete rest.photo;
        return rest;
      });
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (reportType === "lost" && currentStep === 2) {
        // Lost report jumps directly to Step 3 (Review & Confirm)
        setCurrentStep(3);
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all steps
    const valid1 = validateStep(1);
    const valid2 = validateStep(2);
    const valid3 = reportType === "lost" ? true : validateStep(3);

    if (!valid1 || !valid2 || !valid3) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const catIndex = CATEGORIES.findIndex((c) => c.slug === category) + 1;
      const formData = new FormData();
      formData.append("report_type", reportType);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category_id", catIndex > 0 ? catIndex.toString() : "1");
      formData.append("primary_color", colour ? colour.toLowerCase() : "");
      if (brand) formData.append("brand", brand);
      if (distinctiveFeatures) formData.append("distinctive_features", distinctiveFeatures);
      formData.append("campus_area_id", campusArea);
      if (exactLocationNote) formData.append("location_note", exactLocationNote);
      formData.append("occurred_at", incidentDate);
      if (photoFile && reportType === "found") {
        formData.append("photo", photoFile);
      }

      const res = await createReportAction(formData);
      setIsSubmitting(false);

      if (res.success && res.reportId) {
        setCreatedReportId(res.reportId);
        setIsSubmitted(true);
      } else {
        if (res.error?.includes("signed in")) {
          setSubmitError("You must be signed in to submit a report. Please Sign In or Register to link this report to your campus profile.");
        } else {
          // If in local dev environment without Supabase keys set up yet, fallback to UI preview
          if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            setCreatedReportId("preview-id");
            setIsSubmitted(true);
          } else {
            setSubmitError(res.error || "Failed to submit report. Please check your inputs.");
          }
        }
      }
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : "Unexpected error during report submission.");
    }
  };

  // Steps total: 3 steps for both (Step 3 is 'Photo' for Found, 'Review' for Lost)
  const steps = [
    { number: 1, title: "Item Details", subtitle: "What" },
    { number: 2, title: "Location & Date", subtitle: "Where & When" },
    {
      number: 3,
      title: reportType === "found" ? "Visual Photo" : "Review & Submit",
      subtitle: reportType === "found" ? "Identification" : "Confirm",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200 mb-3 shadow-xs">
          <Tag className="h-3.5 w-3.5 text-emerald-800" />
          Campus Incident Report Form
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          {reportType === "lost" ? "Report a Lost Item" : "Report a Found Item"}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
          {reportType === "lost"
            ? "Describe your item's physical characteristics. Secret identifying proof is verified during physical handover."
            : "Upload a clear photo for visual verification. Sensitive identity cards are automatically protected with privacy placeholders."}
        </p>

        {/* Big Report Type Switcher */}
        <div className="mt-6 flex flex-col sm:inline-flex sm:flex-row gap-1.5 rounded-xl border border-stone-200/90 p-1 bg-stone-100 shadow-xs max-w-md mx-auto sm:max-w-none">
          <button
            type="button"
            onClick={() => {
              setReportType("lost");
              setErrors({});
            }}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              reportType === "lost"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-stone-600 hover:text-amber-800"
            }`}
          >
            <Search className="h-4 w-4" />
            I Lost Something
          </button>

          <button
            type="button"
            onClick={() => {
              setReportType("found");
              setErrors({});
            }}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              reportType === "found"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 hover:text-emerald-800"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            I Found Something (1 Photo)
          </button>
        </div>
      </div>

      {/* Confirmation State */}
      {isSubmitted ? (
        <div className="rounded-2xl border border-emerald-200 bg-white/95 p-6 sm:p-8 shadow-md animate-in fade-in-50 duration-200">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mx-auto mb-4 shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-center text-stone-900">
            Report Ready for Campus Matching
          </h2>
          <p className="mt-1 text-center text-xs text-stone-600 max-w-md mx-auto">
            Your {reportType.toUpperCase()} listing has been formatted and prepared for verification.
          </p>

          {/* Submission Details Summary Box */}
          <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:p-5 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <span className="font-bold uppercase tracking-wider text-stone-500">
                Report Type:
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-xs ${
                  reportType === "found"
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                    : "bg-amber-100 text-amber-900 border border-amber-200"
                }`}
              >
                {reportType.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <span className="text-stone-500">Title:</span>
                <p className="font-semibold text-stone-900">{title}</p>
              </div>
              <div>
                <span className="text-stone-500">Category:</span>
                <p className="font-semibold text-stone-900">
                  {CATEGORIES.find((c) => c.slug === category)?.label}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Primary Colour:</span>
                <p className="font-semibold text-stone-900">{colour}</p>
              </div>
              <div>
                <span className="text-stone-500">Campus Area:</span>
                <p className="font-semibold text-stone-900">{campusArea}</p>
              </div>
              {exactLocationNote && (
                <div className="sm:col-span-2">
                  <span className="text-stone-500">Exact Location Spot:</span>
                  <p className="font-semibold text-stone-900">{exactLocationNote}</p>
                </div>
              )}
              <div>
                <span className="text-stone-500">Incident Date:</span>
                <p className="font-semibold text-stone-900">{incidentDate}</p>
              </div>
              <div>
                <span className="text-stone-500">Identification Mode:</span>
                <p className="font-semibold text-stone-900">
                  {reportType === "found" ? "Visual Photo Attached" : "Manual Physical Description"}
                </p>
              </div>
            </div>

            {reportType === "found" && photoPreview && (
              <div className="pt-2 border-t border-stone-200">
                <span className="text-stone-500 block mb-1">Attached Found Photo:</span>
                <div className="relative h-28 w-28 rounded-lg overflow-hidden border border-stone-200 shadow-xs">
                  <Image src={photoPreview} alt="Uploaded item" fill className="object-cover" />
                </div>
              </div>
            )}
          </div>

          {/* Positive Confirmation Callout */}
          <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200/90 p-4 text-xs text-emerald-950 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Active in Campus Matching Network</p>
              <p className="mt-0.5 text-emerald-900 leading-relaxed">
                Your report has been prepared and formatted for campus matching across all 12 zones. When a matching listing is reported, you will be notified to review the details and initiate a verified handover.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            {createdReportId && createdReportId !== "preview-id" && (
              <Link
                href={`/report/${createdReportId}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#0C1512] hover:bg-stone-800 transition-colors text-center shadow-xs"
              >
                View Your Published Report
              </Link>
            )}
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors text-center"
            >
              My Reports Dashboard
            </Link>
            <Link
              href="/explore"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors text-center shadow-xs"
            >
              Browse Active Listings
            </Link>
          </div>
        </div>
      ) : (
        /* Form Wizard */
        <div className="rounded-2xl border border-stone-200/90 bg-white/95 p-5 sm:p-8 shadow-xs">
          {/* Step Indicator Header */}
          <div className="mb-8 border-b border-stone-100 pb-5">
            <div className="flex items-center justify-between">
              {steps.map((s, idx) => {
                const isActive = currentStep === s.number;
                const isPassed = currentStep > s.number;
                return (
                  <div key={s.number} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          isActive
                            ? "bg-[#0C1512] text-white shadow-xs"
                            : isPassed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {isPassed ? "✓" : s.number}
                      </div>
                      <div className="hidden sm:block text-left">
                        <p
                          className={`text-xs font-bold ${
                            isActive ? "text-stone-900" : "text-stone-500"
                          }`}
                        >
                          {s.title}
                        </p>
                        <p className="text-[10px] text-stone-400">{s.subtitle}</p>
                      </div>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="mx-2 sm:mx-4 flex-1 h-0.5 bg-stone-200" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* STEP 1: ITEM DETAILS */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in-50 duration-150">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-stone-900">
                    Step 1: Item Identification
                  </h2>
                  <span className="text-xs text-stone-400">* Required fields</span>
                </div>

                {/* Title */}
                <div>
                  <label
                    htmlFor="report-title"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Item Title *
                  </label>
                  <input
                    id="report-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sony WH-1000XM4 Wireless Headphones, Blue JanSport Backpack"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none transition-colors ${
                      errors.title
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                        : "border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-700"
                    }`}
                  />
                  {errors.title ? (
                    <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.title}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-stone-500">
                      3–100 characters. Keep it concise and identifiable.
                    </p>
                  )}

                  {duplicateWarning && (
                    <div className="mt-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Potential Duplicate Listing</span>
                        You already have an active report matching &ldquo;{duplicateWarning.duplicateTitle}&rdquo;. If this is the same item, consider{' '}
                        <Link
                          href={`/report/${duplicateWarning.duplicateId}`}
                          className="underline font-semibold hover:text-amber-950"
                        >
                          editing your existing report
                        </Link>{' '}
                        instead of posting a duplicate.
                      </div>
                    </div>
                  )}
                </div>

                {/* Category & Colour Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label
                      htmlFor="report-category"
                      className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1"
                    >
                      Category *
                    </label>
                    <select
                      id="report-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-800 focus:outline-none transition-colors ${
                        errors.category
                          ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                          : "border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-700"
                      }`}
                    >
                      <option value="">Select category...</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-xs text-rose-600">{errors.category}</p>
                    )}
                  </div>

                  {/* Primary Colour */}
                  <div>
                    <label
                      htmlFor="report-colour"
                      className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1"
                    >
                      Primary Colour *
                    </label>
                    <select
                      id="report-colour"
                      value={colour}
                      onChange={(e) => setColour(e.target.value as ReportColour)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-800 focus:outline-none transition-colors ${
                        errors.colour
                          ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                          : "border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-700"
                      }`}
                    >
                      <option value="">Select colour...</option>
                      {REPORT_COLOURS.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    {errors.colour && (
                      <p className="mt-1 text-xs text-rose-600">{errors.colour}</p>
                    )}
                  </div>
                </div>

                {/* Restricted Category Warning Banner */}
                {isRestrictedCategory && (
                  <div className="rounded-xl bg-purple-50 border border-purple-200/90 p-4 text-xs text-purple-950 flex items-start gap-2.5">
                    <Shield className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Protected Document Category</p>
                      <p className="text-purple-800 mt-0.5 leading-relaxed">
                        To protect student privacy, photo uploads for ID cards, licenses, and documents
                        are automatically masked with a privacy placeholder on public listings.
                        Sensitive roll numbers or personal details remain protected.
                      </p>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label
                    htmlFor="report-desc"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Item Description *
                  </label>
                  <textarea
                    id="report-desc"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the item's physical appearance, finish, casing, or stickers. Guide the finder to understand what it looks like..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none transition-colors ${
                      errors.description
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                        : "border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-700"
                    }`}
                  />
                  {errors.description ? (
                    <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.description}
                    </p>
                  ) : (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                      <span>10–1,500 characters. Public contact details are rejected.</span>
                      <span>{description.length}/1500</span>
                    </div>
                  )}
                </div>

                {/* Brand & Distinctive Features (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="report-brand"
                      className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1"
                    >
                      Brand / Model <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="report-brand"
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Apple, Casio, Anker, JanSport"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 bg-stone-50/50 focus:bg-white focus:border-emerald-700 focus:outline-none transition-colors"
                    />
                    {errors.brand && <p className="mt-1 text-xs text-rose-600">{errors.brand}</p>}
                  </div>

                  <div>
                    <label
                      htmlFor="report-features"
                      className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1"
                    >
                      Distinctive Features{" "}
                      <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="report-features"
                      type="text"
                      value={distinctiveFeatures}
                      onChange={(e) => setDistinctiveFeatures(e.target.value)}
                      placeholder="e.g. Scratch on left corner, robot keychain, custom sticker"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 bg-stone-50/50 focus:bg-white focus:border-emerald-700 focus:outline-none transition-colors"
                    />
                    {errors.distinctiveFeatures && (
                      <p className="mt-1 text-xs text-rose-600">{errors.distinctiveFeatures}</p>
                    )}
                  </div>
                </div>

                {/* Verification reminder on Lost reports */}
                {reportType === "lost" && (
                  <div className="rounded-xl bg-amber-50/90 border border-amber-200/90 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-amber-800 shrink-0 mt-0.5" />
                    <span>
                      <strong>Verification Note:</strong> Keep secret proof (such as exact wallpaper, lock code, or hidden engraving) private for the verified claim stage.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: LOCATION & DATE */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in-50 duration-150">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-stone-900">
                    Step 2: Campus Location & Incident Date
                  </h2>
                  <span className="text-xs text-stone-400">* Required fields</span>
                </div>

                {/* Campus Area Dropdown (Approved Exact Labels) */}
                <div>
                  <label
                    htmlFor="report-campus-area"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Campus Area *
                  </label>
                  <select
                    id="report-campus-area"
                    value={campusArea}
                    onChange={(e) => setCampusArea(e.target.value as CampusArea)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-800 focus:outline-none transition-colors ${
                      errors.campusArea
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                        : "border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-700"
                    }`}
                  >
                    <option value="">Select campus area...</option>
                    {CAMPUS_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                  {errors.campusArea ? (
                    <p className="mt-1 text-xs text-rose-600">{errors.campusArea}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-stone-500">
                      Select the primary campus building or landmark.
                    </p>
                  )}
                </div>

                {/* Exact Location Note (Optional Free Text) */}
                <div>
                  <label
                    htmlFor="report-exact-location"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Exact Location Note{" "}
                    <span className="text-stone-400 font-normal">(Optional, max 120 chars)</span>
                  </label>
                  <input
                    id="report-exact-location"
                    type="text"
                    value={exactLocationNote}
                    onChange={(e) => setExactLocationNote(e.target.value)}
                    placeholder="e.g. Block B, Electronics Lab 204 or Library 2nd Floor Shelf 14"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 bg-stone-50/50 focus:bg-white focus:border-emerald-700 focus:outline-none transition-colors"
                  />
                  {errors.exactLocationNote ? (
                    <p className="mt-1 text-xs text-rose-600">{errors.exactLocationNote}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-stone-500">
                      Optional specific room, desk, bench, or landmark within the area.
                    </p>
                  )}
                </div>

                {/* Incident Date */}
                <div>
                  <label
                    htmlFor="report-incident-date"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Incident Date *
                  </label>
                  <input
                    id="report-incident-date"
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-900 focus:outline-none transition-colors ${
                      errors.incidentDate
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                        : "border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-700"
                    }`}
                  />
                  {errors.incidentDate ? (
                    <p className="mt-1 text-xs text-rose-600">{errors.incidentDate}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-stone-500">
                      When was the item lost or discovered? (No future dates)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: PHOTO (FOUND ONLY) OR REVIEW (LOST) */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in-50 duration-150">
                {reportType === "found" ? (
                  /* FOUND REPORT PHOTO STEP */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-stone-900">
                        Step 3: Found Item Photo
                      </h2>
                      <span className="text-xs font-bold text-emerald-900 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300/80">
                        1 Clear Photo Required
                      </span>
                    </div>

                    {/* Anti-Fake-Claim Helper Tip (Item 4) */}
                    <div className="rounded-xl bg-emerald-50/90 border border-emerald-200/90 p-4 text-xs text-emerald-950 flex items-start gap-2.5">
                      <Lightbulb className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Finder Protection Tip</p>
                        <p className="mt-0.5 text-emerald-900 leading-relaxed">
                          Tip: Show the item clearly, but keep hidden details (like serial numbers, lock-screen wallpapers, or inside marks) out of the photo so you can verify the true owner during claims.
                        </p>
                      </div>
                    </div>

                    {photoPreview ? (
                      /* Preview of Selected Image */
                      <div className="relative aspect-[16/10] max-w-sm mx-auto rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs">
                        <Image
                          src={photoPreview}
                          alt="Selected item photo preview"
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 text-white hover:bg-stone-900 transition-colors shadow-xs"
                          aria-label="Remove photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      /* Upload Box */
                      <label
                        htmlFor="found-photo-upload"
                        className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
                          errors.photo
                            ? "border-rose-400 bg-rose-50/40"
                            : "border-stone-300 hover:border-emerald-700 bg-stone-50/60 hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mb-3 shadow-xs">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-stone-900">
                          Select 1 item photo to upload
                        </p>
                        <p className="text-xs text-stone-500 mt-1">
                          JPEG, PNG, or WebP (max 10MB)
                        </p>
                        <span className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs">
                          Choose Image File
                        </span>
                        <input
                          id="found-photo-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoChange}
                          className="sr-only"
                        />
                      </label>
                    )}

                    {errors.photo && (
                      <p className="text-xs text-rose-600 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.photo}
                      </p>
                    )}
                  </div>
                ) : (
                  /* LOST REPORT STEP 3: REVIEW & EXPLANATION */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-stone-900">
                        Step 3: Review & Confirm Lost Report
                      </h2>
                      <span className="text-xs font-bold text-amber-950 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                        Description-Led Verification
                      </span>
                    </div>

                    <div className="rounded-xl bg-amber-50/80 border border-amber-200/90 p-4 text-xs text-amber-950">
                      <p className="font-bold">Why Lost reports focus on descriptions</p>
                      <p className="mt-1 text-amber-900 leading-relaxed">
                        As the owner, you describe the item&apos;s physical appearance here and keep unique identifying details (like serial numbers, lock-screen wallpapers, or inside marks) private for the claim verification stage.
                      </p>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs space-y-2">
                      <p className="font-bold text-stone-900 border-b border-stone-200 pb-1.5">
                        Report Overview
                      </p>
                      <p>
                        <strong>Title:</strong> {title}
                      </p>
                      <p>
                        <strong>Category:</strong>{" "}
                        {CATEGORIES.find((c) => c.slug === category)?.label}
                      </p>
                      <p>
                        <strong>Colour:</strong> {colour}
                      </p>
                      <p>
                        <strong>Campus Area:</strong> {campusArea}
                      </p>
                      {exactLocationNote && (
                        <p>
                          <strong>Location Spot:</strong> {exactLocationNote}
                        </p>
                      )}
                      <p>
                        <strong>Incident Date:</strong> {incidentDate}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="pt-6 border-t border-stone-200 flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <Link
                  href="/explore"
                  className="text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </Link>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-[#0C1512] hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>{reportType === "found" ? "Publish Found Report" : "Submit Lost Report"}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {submitError && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
                {submitError.includes('Sign In') && (
                  <Link
                    href="/login?next=/report/new"
                    className="px-3 py-1 bg-red-700 text-white rounded-lg font-semibold shrink-0"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default function CreateReportPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl py-16 text-center text-xs text-stone-500">
          Loading LostLink report form...
        </div>
      }
    >
      <ReportFormContent />
    </Suspense>
  );
}
