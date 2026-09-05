import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Search,
  Sparkles,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { formatDateTime, safeNumber, statusTone } from "../lib/workspace";

const SUGGESTED_CHIPS = [
  "Cardiology consultation",
  "Pediatric checkup",
  "General OPD doctor",
  "Skin dermatology",
  "Orthopedic therapy",
  "Health screening",
];

function safeCollection(value) {
  return Array.isArray(value) ? value : [];
}

export function SearchModal({ open, onClose, role, session, data, onAction, load, setActive }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [rawResults, setRawResults] = useState([]);
  const [patientContext, setPatientContext] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef(null);

  const services = safeCollection(data?.services);
  const departments = safeCollection(data?.departments);
  const slots = safeCollection(data?.slots);
  const providers = safeCollection(data?.providers);

  const servicesById = useMemo(() => {
    const map = new Map();
    services.forEach((s) => map.set(s.id, s));
    return map;
  }, [services]);

  const departmentsById = useMemo(() => {
    const map = new Map();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  const providersById = useMemo(() => {
    const map = new Map();
    providers.forEach((p) => map.set(p.id, p));
    return map;
  }, [providers]);

  // Open slots mapped by service ID
  const availableSlotsByServiceId = useMemo(() => {
    const map = new Map();
    slots
      .filter((slot) => String(slot.status || "").toLowerCase() === "available")
      .forEach((slot) => {
        const sid = slot.service_id;
        if (sid) {
          if (!map.has(sid)) map.set(sid, []);
          map.get(sid).push(slot);
        }
      });
    return map;
  }, [slots]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setRawResults([]);
      setHasSearched(false);
      setNotice("");
      setBookingSlot(null);
    }
  }, [open]);

  // Execute Search
  const runSearch = async (searchTerm = query) => {
    const q = (searchTerm || "").trim();
    if (!q) {
      setRawResults([]);
      setHasSearched(false);
      return;
    }

    setBusy(true);
    setNotice("");

    let apiResults = [];
    let pCtx = null;

    if (onAction) {
      try {
        const res = await onAction({
          scope: "search.query",
          label: "Quick search",
          path: "/search?min_similarity=0.4",
          method: "POST",
          body: { query: q, limit: 10 },
        });
        apiResults = res?.results || [];
        pCtx = res?.patient_context || null;
      } catch (err) {
        console.warn("Backend search endpoint notice:", err);
      }
    }

    // Hybrid Matcher: Combine API vector matches with published catalog matches
    const lower = q.toLowerCase();
    const catalogMatches = services.filter((s) => {
      const text = `${s.name || ""} ${s.description || ""} ${s.specialty || ""} ${s.department_name || ""}`.toLowerCase();
      return text.includes(lower);
    });

    const resultMap = new Map();

    // 1. Add API results
    apiResults.forEach((res) => {
      resultMap.set(res.service_id, {
        service_id: res.service_id,
        service_name: res.service_name,
        score: Number(res.score || 0.75),
        department: res.department || "General",
        specialty: res.specialty || "Clinical Care",
        content: res.content || "",
      });
    });

    // 2. Add local catalog matches that might not have been returned by vector threshold
    catalogMatches.forEach((s) => {
      if (!resultMap.has(s.id)) {
        const dept = departmentsById.get(s.department_id)?.name || s.department_name || "General";
        resultMap.set(s.id, {
          service_id: s.id,
          service_name: s.name,
          score: 0.85,
          department: dept,
          specialty: s.specialty || "Clinical Care",
          content: s.description || "Comprehensive clinical consultation and diagnostic service.",
        });
      }
    });

    const finalResults = Array.from(resultMap.values()).sort((a, b) => b.score - a.score);

    setRawResults(finalResults);
    setPatientContext(pCtx);
    setHasSearched(true);
    setBusy(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    runSearch();
  };

  const handleChipClick = (chipText) => {
    setQuery(chipText);
    runSearch(chipText);
  };

  const handleBookSlot = async (slot) => {
    if (!slot) return;
    setBookingBusy(true);
    try {
      const patientId = data?.patientProfile?.id || session?.patientId || session?.userId;
      await onAction({
        scope: "patient.book",
        label: "Book appointment",
        path: "/appointments",
        method: "POST",
        body: { slot_id: slot.id, patient_id: patientId },
        successMessage: "Appointment booked successfully!",
      });
      setBookingSlot(null);
      onClose();
      await load?.();
      setActive("Appointments");
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBookingBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 pt-12 sm:pt-20 backdrop-blur-xs"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Bar */}
        <form onSubmit={handleFormSubmit} className="relative flex items-center border-b border-slate-100 px-4 py-3.5">
          <Search
            size={18}
            className={`pointer-events-none text-slate-400 ${busy ? "animate-pulse text-[#0f766e]" : ""}`}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) runSearch(e.target.value);
              else {
                setRawResults([]);
                setHasSearched(false);
              }
            }}
            placeholder="Search symptoms, specialties, or services (e.g. cardiology, checkup, dermatology)..."
            className="h-10 w-full border-none bg-transparent pl-3 pr-8 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRawResults([]);
                setHasSearched(false);
              }}
              className="mr-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={15} />
            </button>
          ) : null}
          <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400 sm:inline">
            ESC
          </span>
        </form>

        {/* Suggested Quick Chips */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick:</span>
          {SUGGESTED_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="rounded-full border border-slate-200/80 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs hover:border-[#8ccfc1] hover:bg-emerald-50 hover:text-[#0f766e]"
            >
              {chip}
            </button>
          ))}
        </div>

        {notice ? (
          <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {notice}
          </div>
        ) : null}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {hasSearched ? (
            rawResults.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                  <span>Found {rawResults.length} matching services</span>
                </div>

                {rawResults.map((result) => {
                  const fullService = servicesById.get(result.service_id);
                  const matchingSlots = availableSlotsByServiceId.get(result.service_id) || [];
                  const matchPct = Math.round(Number(result.score || 0.8) * 100);

                  return (
                    <div
                      key={result.service_id}
                      className="group flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 transition-all hover:border-[#8ccfc1] hover:shadow-xs sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-bold text-slate-950">
                            {result.service_name}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {result.department}
                          </span>
                          {result.specialty && (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#0f766e]">
                              {result.specialty}
                            </span>
                          )}
                          <span className="ml-auto text-[11px] font-bold text-emerald-700 sm:ml-0">
                            {matchPct}% Match
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                          {result.content || "Comprehensive clinical consultation and patient care service."}
                        </p>

                        {/* Metadata & Slots Preview */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {fullService?.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              {fullService.duration_minutes}m
                            </span>
                          )}
                          {fullService?.price !== undefined && fullService?.price !== null && (
                            <span className="font-semibold text-slate-800">
                              ${Number(fullService.price).toFixed(2)}
                            </span>
                          )}

                          {matchingSlots.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#0f766e]">
                              <Calendar size={11} />
                              {matchingSlots.length} slot{matchingSlots.length > 1 ? "s" : ""} open
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Action Button per Role */}
                      <div className="flex shrink-0 items-center gap-2 sm:self-center">
                        {role === "patient" ? (
                          matchingSlots.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setBookingSlot({
                                  slot: matchingSlots[0],
                                  serviceName: result.service_name,
                                  provider: providersById.get(matchingSlots[0].provider_id),
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#115e59]"
                            >
                              <Calendar size={12} />
                              <span>Book Slot</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                setActive("Appointments");
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f766e] hover:underline"
                            >
                              <span>Appointments</span>
                              <ArrowRight size={12} />
                            </button>
                          )
                        ) : role === "provider" ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              setActive("Schedule");
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#0f766e] hover:text-[#0f766e]"
                          >
                            <span>Schedule</span>
                            <ArrowRight size={12} />
                          </button>
                        ) : role === "front_desk" ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              setActive("Desk");
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#115e59]"
                          >
                            <span>Desk Queue</span>
                            <ArrowRight size={12} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              setActive("Catalog");
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <span>Catalog</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-slate-900">No matching services found</p>
                <p className="mt-1 text-xs text-slate-500">
                  Try searching for another symptom, specialty, or general checkup term.
                </p>
              </div>
            )
          ) : (
            <div className="py-8 text-center text-slate-400">
              <Sparkles size={24} className="mx-auto text-emerald-600/60" />
              <p className="mt-2 text-xs font-medium text-slate-600">
                Type a clinical query above to discover matching services & open slots.
              </p>
            </div>
          )}
        </div>

        {/* Slot Booking Confirmation Inside Modal */}
        {bookingSlot ? (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#0f766e]">Confirm Booking</p>
                <p className="text-xs font-bold text-slate-900">
                  {bookingSlot.serviceName} · {formatDateTime(bookingSlot.slot.start_datetime)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBookingSlot(null)}
                  disabled={bookingBusy}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleBookSlot(bookingSlot.slot)}
                  disabled={bookingBusy}
                  className="rounded-xl bg-[#0f766e] px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#115e59]"
                >
                  {bookingBusy ? "Confirming..." : "Confirm Reservation"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
