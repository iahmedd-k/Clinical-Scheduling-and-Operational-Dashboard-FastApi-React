import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  FileText,
  Filter,
  Globe,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ActionButton, EmptyState, InfoCard, Panel, StatusPill } from "../components/ui";
import { formatDateTime, safeNumber, statusTone } from "../lib/workspace";

function safeCollection(value) {
  return Array.isArray(value) ? value : [];
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function displayPerson(person, fallback = "Unknown provider") {
  if (!person) return fallback;
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return fullName || person.name || fallback;
}

function displayDepartment(department, fallback = "Unassigned") {
  return department?.name || department?.title || fallback;
}

function displayService(service, fallback = "Service") {
  return service?.name || service?.title || fallback;
}

function appointmentLabel(appointment, slotById, servicesById, providersById) {
  const slot = slotById.get(String(appointment?.slot_id));
  const service = slot ? servicesById.get(String(slot.service_id)) : null;
  const provider = slot ? providersById.get(String(slot.provider_id)) : null;
  return {
    service: displayService(service, "Booked appointment"),
    provider: displayPerson(provider, "Assigned provider"),
    time: slot?.start_datetime ? formatDateTime(slot.start_datetime) : formatDateTime(appointment?.start_time || appointment?.scheduled_at || appointment?.created_at),
    detail: [service?.specialty || service?.description, displayPerson(provider, "")].filter(Boolean).join(" · ") || "No additional details",
  };
}

export function ProviderView({ active, data, onAction, load }) {
  const safeData = {
    ...data,
    departments: safeCollection(data?.departments),
    appointments: safeCollection(data?.appointments),
    slots: safeCollection(data?.slots),
    patients: safeCollection(data?.patients),
    providers: safeCollection(data?.providers),
    services: safeCollection(data?.services),
    providerServices: safeCollection(data?.providerServices),
  };

  if (!safeData.ownProvider) {
    return <ProviderSetup data={safeData} onAction={onAction} load={load} />;
  }

  const context = getProviderContext(safeData);
  const providerServices = getProviderServices(safeData);

  if (active === "Patients") {
    return <ProviderPatients data={safeData} context={context} load={load} />;
  }

  if (active === "Visits") {
    return <ProviderVisits data={safeData} context={context} onAction={onAction} load={load} />;
  }

  if (active === "Profile") {
    return <ProviderProfile data={safeData} departments={safeData.departments} onAction={onAction} load={load} />;
  }

  if (active === "Services") {
    return <ProviderServices data={safeData} providerServices={providerServices} onAction={onAction} load={load} />;
  }

  return <ProviderSchedule data={safeData} context={context} providerServices={providerServices} onAction={onAction} load={load} />;
}

function ProviderProfile({ data, departments, onAction, load }) {
  const provider = data.ownProvider;
  const [form, setForm] = useState({ bio: provider.bio || "", specialty: provider.specialty || "", department_id: provider.department_id || "" });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setForm({ bio: provider.bio || "", specialty: provider.specialty || "", department_id: provider.department_id || "" });
  }, [provider.bio, provider.specialty, provider.department_id]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await onAction({
        scope: "provider.profile.update",
        label: "Update provider profile",
        path: `/providers/${provider.id}`,
        method: "PATCH",
        body: { ...form, department_id: toNumberOrNull(form.department_id) },
        successMessage: "Provider profile updated",
      });
      setEditing(false);
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-full flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#168479]">
              <Stethoscope size={14} /> Profile
            </div>
            <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-[#173b4a]">Professional profile</h2>
          </div>
          {!editing ? (
            <ActionButton onClick={() => setEditing(true)}>
              <Activity size={14} /> Edit profile
            </ActionButton>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <form onSubmit={save} className="max-w-3xl space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Specialty" value={form.specialty} onChange={(value) => setForm((current) => ({ ...current, specialty: value }))} disabled={!editing} />
              <SelectField label="Department" value={form.department_id} onChange={(value) => setForm((current) => ({ ...current, department_id: value }))} placeholder={editing ? "Choose department" : "No department selected"} disabled={!editing}>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </SelectField>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Professional bio</span>
              <textarea
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                disabled={!editing}
                rows="4"
                className="w-full resize-y rounded-2xl border border-slate-200 bg-white shadow-sm px-3.5 py-2.5 text-[13px] outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
              />
            </label>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                <ActionButton type="submit" disabled={busy}>Save changes</ActionButton>
                <ActionButton tone="secondary" onClick={() => setEditing(false)} disabled={busy}>Cancel</ActionButton>
              </div>
            ) : null}
            {notice ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{notice}</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}

function ProviderSetup({ data, onAction, load }) {
  const [form, setForm] = useState({
    specialty: "",
    bio: "",
    department_id: "",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const departments = safeCollection(data?.departments);

  const createProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");

    try {
      await onAction({
        scope: "provider.profile.create",
        label: "Create provider profile",
        path: "/providers",
        method: "POST",
        body: {
          specialty: form.specialty,
          bio: form.bio,
          department_id: toNumberOrNull(form.department_id),
        },
        successMessage: "Provider profile created",
      });
      setForm({ specialty: "", bio: "", department_id: "" });
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProviderShell
      eyebrow="Provider onboarding"
      title="Set up your care profile"
      detail="Complete your linked provider profile first. We only need specialty, department, and a short bio. No provider ID entry is required."
      icon={Stethoscope}
      refresh={load}
    >
      <Panel eyebrow="Profile" title="No provider profile linked yet" description="Create one provider profile for this signed-in account to unlock schedule, services, and visits.">
        <form onSubmit={createProfile} className="max-w-3xl space-y-4">
          <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
            Your provider profile is attached to the signed-in account automatically. You do not need to enter a provider ID.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Specialty"
              value={form.specialty}
              onChange={(value) => setForm((current) => ({ ...current, specialty: value }))}
              placeholder="e.g. Cardiology"
            />
            <InfoCard label="Signed-in account" value={data.sessionUserId ? `Account #${data.sessionUserId}` : "linked automatically"} />
          </div>

          <SelectField
            label="Department"
            value={form.department_id}
            onChange={(value) => setForm((current) => ({ ...current, department_id: value }))}
            placeholder="Choose department"
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </SelectField>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Professional bio
            </span>
            <textarea
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              rows="5"
              placeholder="Describe your care focus and experience"
              className="w-full resize-y rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <ActionButton type="submit" disabled={busy || !departments.length || !form.specialty || !form.department_id}>
              {busy ? "Creating profile..." : "Create provider profile"}
            </ActionButton>
            <ActionButton tone="secondary" type="button" onClick={load} disabled={busy}>
              Refresh departments
            </ActionButton>
          </div>

          {!departments.length ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No departments are available yet. An admin needs to create at least one department before provider onboarding can continue.
            </p>
          ) : null}

          {notice ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{notice}</p> : null}
        </form>
      </Panel>
    </ProviderShell>
  );
}

function formatSlotDateBadge(value) {
  const date = parseDate(value);
  if (!date) return { month: "---", day: "--", weekday: "---", full: "Not scheduled", isToday: false };
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  const weekday = date.toLocaleString("en-US", { weekday: "short" });
  return {
    month,
    day,
    weekday,
    full: date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    isToday: isSameDay(date, new Date()),
  };
}

function formatSlotTimeDetails(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start) return { range: "Time not set", duration: "", minutes: 0 };

  const startFormatted = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (!end) return { range: startFormatted, duration: "Open-ended", minutes: 0 };

  const endFormatted = end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
  const duration = minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
    : `${minutes}m`;

  return {
    range: `${startFormatted} – ${endFormatted}`,
    duration,
    minutes,
  };
}

function getInitials(name = "") {
  const clean = String(name || "").trim().replace(/^patient\s*/i, "P ");
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ProviderSchedule({ data, context, providerServices, onAction, load }) {
  const [form, setForm] = useState({ service_id: "", start_datetime: "", end_datetime: "" });
  const [editingSlot, setEditingSlot] = useState(null);
  const [pendingDeleteSlot, setPendingDeleteSlot] = useState(null);
  const [cancelingAppointment, setCancelingAppointment] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [reschedulingAppointment, setReschedulingAppointment] = useState(null);
  const [selectedRescheduleSlotId, setSelectedRescheduleSlotId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("windows"); // "windows" | "queue"
  const [slotFilter, setSlotFilter] = useState("all"); // "all" | "available" | "booked"
  const [searchQuery, setSearchQuery] = useState("");

  const servicesById = useMemo(() => new Map(providerServices.map((service) => [String(service.id), service])), [providerServices]);
  const providersById = useMemo(() => new Map(safeCollection(context.providers).map((provider) => [String(provider.id), provider])), [context.providers]);
  const patientsById = useMemo(() => new Map(safeCollection(data?.patients).map((patient) => [String(patient.id), patient])), [data?.patients]);
  const slots = useMemo(
    () => safeCollection(context?.slots).filter((slot) => parseDate(slot.start_datetime)).sort((left, right) => parseDate(left.start_datetime) - parseDate(right.start_datetime)),
    [context?.slots]
  );
  const appointments = safeCollection(context?.appointments);

  const appointmentsBySlotId = useMemo(() => {
    const map = new Map();
    for (const appt of appointments) {
      if (appt.slot_id) {
        map.set(String(appt.slot_id), appt);
      }
    }
    return map;
  }, [appointments]);

  const upcomingVisits = useMemo(
    () => appointments
      .filter((item) => !["CANCELLED", "COMPLETED"].includes(String(item?.status || "").toUpperCase()))
      .sort((left, right) => appointmentTime(left, slots) - appointmentTime(right, slots)),
    [appointments, slots]
  );

  const openSlots = useMemo(() => slots.filter((slot) => String(slot.status || "").toUpperCase() === "AVAILABLE"), [slots]);
  const bookedSlots = useMemo(() => slots.filter((slot) => String(slot.status || "").toUpperCase() !== "AVAILABLE"), [slots]);
  const todayOpenSlots = useMemo(() => openSlots.filter((slot) => isSameDay(slot.start_datetime, new Date())), [openSlots]);
  const nextVisit = upcomingVisits[0] || null;

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const isAvailable = String(slot.status || "").toUpperCase() === "AVAILABLE";
      if (slotFilter === "available" && !isAvailable) return false;
      if (slotFilter === "booked" && isAvailable) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const service = servicesById.get(String(slot.service_id));
        const serviceName = displayService(service, "Open slot").toLowerCase();
        const dateBadge = formatSlotDateBadge(slot.start_datetime);
        const appt = appointmentsBySlotId.get(String(slot.id));
        const pt = appt ? patientsById.get(String(appt.patient_id)) : null;
        const ptName = (displayPerson(pt, "") || "").toLowerCase();
        const match = serviceName.includes(q) || dateBadge.full.toLowerCase().includes(q) || ptName.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [slots, slotFilter, searchQuery, servicesById, appointmentsBySlotId, patientsById]);

  const buildEditDraft = (slot) => {
    const start = parseDate(slot.start_datetime);
    const fallbackEnd = start ? new Date(start.getTime() + 60 * 60 * 1000) : null;
    return {
      ...slot,
      service_id: String(slot.service_id || ""),
      start_datetime: toLocalInput(slot.start_datetime),
      end_datetime: toLocalInput(slot.end_datetime || fallbackEnd),
    };
  };

  const applyDuration = (minutes) => {
    let baseStart = form.start_datetime ? new Date(form.start_datetime) : null;
    if (!baseStart || Number.isNaN(baseStart.getTime())) {
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
      baseStart = now;
    }
    const end = new Date(baseStart.getTime() + minutes * 60 * 1000);
    setForm((prev) => ({
      ...prev,
      start_datetime: toLocalInput(baseStart),
      end_datetime: toLocalInput(end),
    }));
  };

  const applyPresetDate = (preset) => {
    const d = new Date();
    if (preset === "tomorrow") {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(9, 0, 0, 0);
    const end = new Date(d.getTime() + 60 * 60 * 1000);
    setForm((prev) => ({
      ...prev,
      start_datetime: toLocalInput(d),
      end_datetime: toLocalInput(end),
    }));
  };

  const applyEditDuration = (minutes) => {
    if (!editingSlot?.start_datetime) return;
    const start = new Date(editingSlot.start_datetime);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    setEditingSlot((prev) => ({
      ...prev,
      end_datetime: toLocalInput(end),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setNotice("");
    const start = form.start_datetime ? new Date(form.start_datetime) : null;
    const end = form.end_datetime ? new Date(form.end_datetime) : null;

    if (!context.providerId || !form.service_id || !start || !end) {
      setNotice("Choose a service and both start and end times.");
      return;
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start <= new Date()) {
      setNotice("Availability must start in the future.");
      return;
    }

    if (end <= start) {
      setNotice("End time must be after the start time.");
      return;
    }

    setBusy(true);
    try {
      await onAction({
        scope: "provider.slot",
        label: "Create slot",
        path: "/slots",
        method: "POST",
        body: {
          provider_id: context.providerId,
          service_id: toNumberOrNull(form.service_id),
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          status: "AVAILABLE",
        },
        successMessage: "Availability published",
      });
      setForm({ service_id: "", start_datetime: "", end_datetime: "" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const updateSlot = async (event) => {
    event.preventDefault();
    if (!editingSlot?.start_datetime || !editingSlot?.end_datetime) {
      setNotice("Add both start and end times before saving the slot.");
      return;
    }

    const start = new Date(editingSlot.start_datetime);
    const end = new Date(editingSlot.end_datetime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setNotice("The slot times are invalid. Please pick valid start and end values.");
      return;
    }

    if (end <= start) {
      setNotice("End time must be after start time.");
      return;
    }

    setBusy(true);
    try {
      await onAction({
        scope: "provider.slot.update",
        label: "Update slot",
        path: `/slots/${editingSlot.id}`,
        method: "PATCH",
        body: {
          provider_id: context.providerId,
          service_id: toNumberOrNull(editingSlot.service_id),
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          status: "AVAILABLE",
        },
        successMessage: "Availability updated",
      });
      setEditingSlot(null);
      setPendingDeleteSlot(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const requestDeleteSlot = (slot) => {
    setPendingDeleteSlot(slot);
  };

  const confirmDeleteSlot = async () => {
    if (!pendingDeleteSlot) return;
    setBusy(true);
    try {
      await onAction({
        scope: "provider.slot.delete",
        label: "Delete slot",
        path: `/slots/${pendingDeleteSlot.id}`,
        method: "DELETE",
        successMessage: "Availability removed",
      });
      setPendingDeleteSlot(null);
      setEditingSlot(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancelingAppointment) return;
    setBusy(true);
    setNotice("");
    try {
      await onAction({
        scope: "provider.appointment.cancel",
        label: "Cancel appointment",
        path: `/appointments/${cancelingAppointment.id}/cancel`,
        method: "POST",
        body: { reason: cancelReason.trim() || null },
        successMessage: "Appointment cancelled",
      });
      setCancelingAppointment(null);
      setCancelReason("");
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!reschedulingAppointment || !selectedRescheduleSlotId) return;
    setBusy(true);
    setNotice("");
    try {
      await onAction({
        scope: "provider.appointment.reschedule",
        label: "Reschedule appointment",
        path: `/appointments/${reschedulingAppointment.id}/reschedule`,
        method: "POST",
        body: { slot_id: toNumberOrNull(selectedRescheduleSlotId) },
        successMessage: "Appointment rescheduled",
      });
      setReschedulingAppointment(null);
      setSelectedRescheduleSlotId("");
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-full flex-col">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#168479]">
              <CalendarDays size={15} /> Schedule
            </div>
            <h2 className="mt-0.5 text-[18px] font-bold tracking-[-0.02em] text-[#173b4a]">Availability desk</h2>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-[#d9e7e2] bg-[#fbfdfc] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#106963] transition hover:bg-[#e7f5f2]"
          >
            Refresh
          </button>
        </header>

        {/* Interactive Stats Strip */}
        <div className="grid grid-cols-2 border-b border-[#d9e7e2] sm:grid-cols-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("windows");
              setSlotFilter("available");
            }}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-emerald-50/60 ${
              activeTab === "windows" && slotFilter === "available" ? "bg-emerald-50/50" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0f766e]">
              <Clock3 size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{openSlots.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Open slots</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("windows");
              setSlotFilter("all");
            }}
            className="flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 sm:border-r"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <CalendarDays size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{todayOpenSlots.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Today open</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-teal-50/60 ${
              activeTab === "queue" ? "bg-teal-50/50" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Activity size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{upcomingVisits.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Booked queue</p>
            </div>
          </button>

          <div className="flex items-center gap-3 px-4 py-3 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Users size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{safeCollection(context?.patients).length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Patients</p>
            </div>
          </div>
        </div>

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid min-h-0 flex-1 gap-3.5 p-3.5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
          {/* Left: Publish Window Section */}
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#fbfdfc] p-4 shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#168479]">Publish</p>
                  <h3 className="mt-0.5 text-[15px] font-bold text-[#173b4a]">Open a time window</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Patients can immediately self-book this window once published.</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#0f766e]">
                  <Plus size={18} />
                </div>
              </div>

              <form onSubmit={submit} className="mt-4 space-y-3.5">
                <div>
                  <SelectField
                    label="Service"
                    value={form.service_id}
                    onChange={(value) => setForm((current) => ({ ...current, service_id: value }))}
                    placeholder={providerServices.length ? "Choose service" : "Create a service first"}
                    disabled={!providerServices.length}
                  >
                    {providerServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {displayService(service)}
                      </option>
                    ))}
                  </SelectField>
                </div>

                {/* Quick Date Presets */}
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Quick date presets
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applyPresetDate("today")}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#0f766e] hover:bg-emerald-50/50 hover:text-[#0f766e]"
                    >
                      Today 9 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDate("tomorrow")}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#0f766e] hover:bg-emerald-50/50 hover:text-[#0f766e]"
                    >
                      Tomorrow 9 AM
                    </button>
                  </div>
                </div>

                {/* Starts & Ends */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Starts"
                    value={form.start_datetime}
                    onChange={(value) => setForm((current) => ({ ...current, start_datetime: value }))}
                    type="datetime-local"
                  />
                  <Field
                    label="Ends"
                    value={form.end_datetime}
                    onChange={(value) => setForm((current) => ({ ...current, end_datetime: value }))}
                    type="datetime-local"
                  />
                </div>

                {/* Quick Duration Buttons */}
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Set duration from start
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => applyDuration(mins)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#0f766e] hover:bg-emerald-50 hover:text-[#0f766e]"
                      >
                        +{mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {notice ? (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <AlertCircle size={15} className="shrink-0 text-rose-600" />
                    <span>{notice}</span>
                  </div>
                ) : null}

                <ActionButton
                  type="submit"
                  disabled={!context.providerId || busy || !providerServices.length}
                  className="w-full"
                >
                  <Plus size={16} />
                  {busy ? "Publishing window..." : "Publish availability window"}
                </ActionButton>
              </form>
            </div>

            {/* Up Next Spotlight Card */}
            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#168479]">
                  Up next in clinic
                </span>
                {nextVisit ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  </span>
                ) : null}
              </div>

              {nextVisit ? (
                (() => {
                  const summary = appointmentLabel(nextVisit, new Map(slots.map((s) => [String(s.id), s])), servicesById, providersById);
                  const pt = patientsById.get(String(nextVisit.patient_id));
                  const ptName = pt ? displayPerson(pt, `Patient #${nextVisit.patient_id}`) : `Patient #${nextVisit.patient_id}`;
                  return (
                    <div className="mt-2.5 rounded-xl border border-[#d9e7e2] bg-white p-3 shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-slate-950">{ptName}</p>
                          <p className="truncate text-xs text-slate-500">{summary.service}</p>
                        </div>
                        <StatusPill value={nextVisit.status} tone={statusTone(nextVisit.status)} />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <span className="flex items-center gap-1 font-semibold text-[#0f766e]">
                          <Clock3 size={13} />
                          {summary.time}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("queue")}
                          className="flex items-center gap-1 text-[11px] font-bold text-[#0f766e] hover:underline"
                        >
                          View in queue <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-white/70 p-3 text-center text-xs text-slate-500">
                  Queue is clear · No upcoming patient visits
                </div>
              )}
            </div>
          </section>

          {/* Right: Restructured Segmented View (Live Schedule vs Booked Queue) */}
          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {/* Segmented Tab Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9e7e2] pb-3.5">
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("windows")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "windows"
                      ? "bg-white text-[#173b4a] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Calendar size={14} className={activeTab === "windows" ? "text-[#0f766e]" : "text-slate-400"} />
                  <span>Live Schedule</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    activeTab === "windows" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {slots.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("queue")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "queue"
                      ? "bg-white text-[#173b4a] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Activity size={14} className={activeTab === "queue" ? "text-[#0f766e]" : "text-slate-400"} />
                  <span>Booked Queue</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    activeTab === "queue" ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {upcomingVisits.length}
                  </span>
                </button>
              </div>

              {activeTab === "windows" ? (
                <span className="text-xs font-medium text-slate-500">
                  {openSlots.length} available · {bookedSlots.length} booked
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500">
                  {upcomingVisits.length} appointments scheduled
                </span>
              )}
            </div>

            {/* Sub-bar for Live Schedule Windows */}
            {activeTab === "windows" ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSlotFilter("all")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      slotFilter === "all" ? "bg-[#0f766e] text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    All ({slots.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotFilter("available")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      slotFilter === "available" ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Available ({openSlots.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotFilter("booked")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      slotFilter === "booked" ? "bg-sky-700 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Booked ({bookedSlots.length})
                  </button>
                </div>

                <div className="relative min-w-[170px] flex-1 sm:max-w-[220px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter service or date..."
                    className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs outline-none transition focus:border-[#0f766e] focus:bg-white"
                  />
                </div>
              </div>
            ) : null}

            {/* Content List Area */}
            <div className="mt-3.5 max-h-[540px] min-h-0 flex-1 overflow-y-auto pr-1 space-y-2.5 [overscroll-behavior:contain]">
              {activeTab === "windows" ? (
                <>
                  {filteredSlots.map((slot) => {
                    const service = servicesById.get(String(slot.service_id));
                    const isAvailable = String(slot.status || "").toUpperCase() === "AVAILABLE";
                    const dateBadge = formatSlotDateBadge(slot.start_datetime);
                    const timeInfo = formatSlotTimeDetails(slot.start_datetime, slot.end_datetime);
                    const linkedAppt = appointmentsBySlotId.get(String(slot.id));
                    const linkedPatient = linkedAppt ? patientsById.get(String(linkedAppt.patient_id)) : null;
                    const patientDisplayName = linkedPatient
                      ? displayPerson(linkedPatient, `Patient #${linkedAppt.patient_id}`)
                      : linkedAppt
                      ? `Patient #${linkedAppt.patient_id}`
                      : null;

                    return (
                      <div
                        key={slot.id}
                        className="group flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 transition-all hover:border-[#8ccfc1] hover:shadow-xs sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Calendar Date Badge */}
                          <div
                            className={`flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-xl border text-center transition ${
                              isAvailable ? "border-emerald-200/80 bg-emerald-50/50" : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                isAvailable ? "text-[#0f766e]" : "text-slate-500"
                              }`}
                            >
                              {dateBadge.month}
                            </span>
                            <span className="text-[17px] font-extrabold leading-none text-slate-900">
                              {dateBadge.day}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase">
                              {dateBadge.weekday}
                            </span>
                          </div>

                          {/* Time & Service Info */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[14px] font-bold tracking-tight text-slate-900">
                                {timeInfo.range}
                              </span>
                              {timeInfo.duration ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                  {timeInfo.duration}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 font-semibold text-[#173b4a]">
                                <Sparkles size={12} className="text-[#0f766e]" />
                                {displayService(service, "Open slot")}
                              </span>
                              <span className="text-slate-300">·</span>
                              {isAvailable ? (
                                <span className="text-emerald-700 font-medium">Ready for booking</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                  <User size={12} className="text-[#0f766e]" />
                                  {patientDisplayName || "Booked by patient"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {isAvailable ? (
                            <>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                Available
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setNotice("");
                                  setEditingSlot(buildEditDraft(slot));
                                  setPendingDeleteSlot(null);
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:border-[#0f766e] hover:text-[#0f766e]"
                                title="Edit slot window"
                              >
                                <Edit3 size={13} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDeleteSlot(slot)}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-xl border border-transparent px-2.5 py-1.5 text-[12px] font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50"
                                title="Delete slot window"
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                                Booked
                              </span>
                              {linkedAppt ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("queue")}
                                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                                >
                                  <span>View in queue</span>
                                  <ArrowRight size={12} className="text-[#0f766e]" />
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {!filteredSlots.length ? (
                    <div className="py-6">
                      <EmptyState
                        icon={slots.length ? Filter : Clock3}
                        title={slots.length ? "No matching windows" : "No availability windows yet"}
                        detail={
                          slots.length
                            ? "Try clearing your search query or switching filters."
                            : "Publish your first time window using the form on the left."
                        }
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                /* Booked Patient Queue List */
                <>
                  {upcomingVisits.map((appointment) => {
                    const summary = appointmentLabel(appointment, new Map(slots.map((s) => [String(s.id), s])), servicesById, providersById);
                    const patient = patientsById.get(String(appointment.patient_id));
                    const patientName = patient ? displayPerson(patient, `Patient #${appointment.patient_id}`) : `Patient #${appointment.patient_id}`;
                    const initials = getInitials(patientName);
                    const slot = slots.find((s) => String(s.id) === String(appointment.slot_id));
                    const timeInfo = slot ? formatSlotTimeDetails(slot.start_datetime, slot.end_datetime) : null;

                    return (
                      <div
                        key={appointment.id}
                        className="group flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 transition-all hover:border-[#8ccfc1] hover:shadow-xs sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100/80 text-sm font-bold text-[#0f766e]">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate text-[14px] font-bold text-slate-950">
                                {patientName}
                              </h4>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                ID #{appointment.patient_id}
                              </span>
                            </div>

                            <p className="mt-0.5 text-xs font-medium text-slate-700">
                              {summary.service}
                            </p>

                            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1 font-semibold text-[#0f766e]">
                                <Clock3 size={13} />
                                {summary.time}
                              </span>
                              {timeInfo?.duration ? (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  {timeInfo.duration}
                                </span>
                              ) : null}
                              {patient?.email ? (
                                <span className="truncate text-slate-400">· {patient.email}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:self-center">
                          <StatusPill value={appointment.status} tone={statusTone(appointment.status)} />
                          {!["CANCELLED", "COMPLETED"].includes(String(appointment.status || "").toUpperCase()) && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setReschedulingAppointment(appointment);
                                  setSelectedRescheduleSlotId("");
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#0f766e] hover:text-[#0f766e]"
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelingAppointment(appointment);
                                  setCancelReason("");
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {!upcomingVisits.length ? (
                    <div className="py-6">
                      <EmptyState
                        icon={Activity}
                        title="Booked queue is empty"
                        detail="There are no booked patient visits in your schedule right now."
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </div>

        {/* Edit Slot Modal */}
        {editingSlot ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
            <form onSubmit={updateSlot} className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#168479]">Edit slot</p>
                  <h3 className="mt-0.5 text-[16px] font-bold text-[#173b4a]">Slot #{editingSlot.id}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Update the service or adjust time window boundaries.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlot(null);
                    setPendingDeleteSlot(null);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Service"
                  value={editingSlot.service_id}
                  onChange={(value) => setEditingSlot((current) => ({ ...current, service_id: value }))}
                  placeholder={providerServices.length ? "Choose service" : "Create a service first"}
                  disabled={!providerServices.length}
                >
                  {providerServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {displayService(service)}
                    </option>
                  ))}
                </SelectField>
                <div className="rounded-[18px] bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-medium text-slate-500">Status</p>
                  <p className="mt-1 text-[14px] font-bold tracking-[-0.01em] text-slate-950">{editingSlot.status || "AVAILABLE"}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Starts"
                  value={editingSlot.start_datetime}
                  onChange={(value) => setEditingSlot((current) => ({ ...current, start_datetime: value }))}
                  type="datetime-local"
                />
                <Field
                  label="Ends"
                  value={editingSlot.end_datetime}
                  onChange={(value) => setEditingSlot((current) => ({ ...current, end_datetime: value }))}
                  type="datetime-local"
                />
              </div>

              {/* Edit Duration Helpers */}
              <div className="mt-3">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Quick adjust duration from start
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => applyEditDuration(mins)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#0f766e] hover:bg-emerald-50 hover:text-[#0f766e]"
                    >
                      +{mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>

              {notice ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{notice}</span>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <ActionButton type="submit" disabled={busy || !providerServices.length}>
                    Save changes
                  </ActionButton>
                  <ActionButton
                    tone="secondary"
                    type="button"
                    onClick={() => {
                      setEditingSlot(null);
                      setPendingDeleteSlot(null);
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </ActionButton>
                </div>
                <ActionButton
                  type="button"
                  tone="danger"
                  onClick={() => requestDeleteSlot(editingSlot)}
                  disabled={busy}
                >
                  Delete slot
                </ActionButton>
              </div>
            </form>
          </div>
        ) : null}

        {/* Delete Confirmation Dialog */}
        {pendingDeleteSlot ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">Delete Availability Window</h3>
                  <p className="text-xs text-slate-500">
                    Slot #{pendingDeleteSlot.id} · {formatDateTime(pendingDeleteSlot.start_datetime)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                Are you sure you want to remove this availability window? Once deleted, patients can no longer book this time slot.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2.5">
                <ActionButton
                  type="button"
                  tone="secondary"
                  onClick={() => setPendingDeleteSlot(null)}
                  disabled={busy}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="button"
                  tone="danger"
                  onClick={confirmDeleteSlot}
                  disabled={busy}
                >
                  {busy ? "Deleting..." : "Yes, delete window"}
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}

        {/* Cancel Appointment Modal */}
        {cancelingAppointment ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">Cancel Booked Appointment</h3>
                  <p className="text-xs text-slate-500">Appointment #{cancelingAppointment.id}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Cancellation Reason (Optional)</span>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Provider emergency, schedule conflict..."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-[#0f766e] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>

              {notice ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{notice}</span>
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <ActionButton type="button" tone="secondary" onClick={() => setCancelingAppointment(null)} disabled={busy}>
                  Back
                </ActionButton>
                <ActionButton type="button" tone="danger" onClick={handleCancelAppointment} disabled={busy}>
                  {busy ? "Cancelling..." : "Confirm Cancellation"}
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}

        {/* Reschedule Appointment Modal */}
        {reschedulingAppointment ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-[16px] font-bold text-slate-900">Reschedule Appointment #{reschedulingAppointment.id}</h3>
                <button
                  type="button"
                  onClick={() => setReschedulingAppointment(null)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <SelectField
                  label="Select New Available Slot"
                  value={selectedRescheduleSlotId}
                  onChange={(val) => setSelectedRescheduleSlotId(val)}
                  placeholder={openSlots.length ? "Choose available slot" : "No open slots available"}
                  disabled={!openSlots.length}
                >
                  {openSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatDateTime(slot.start_datetime)} (Slot #{slot.id})
                    </option>
                  ))}
                </SelectField>
              </div>

              {notice ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{notice}</span>
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <ActionButton type="button" tone="secondary" onClick={() => setReschedulingAppointment(null)} disabled={busy}>
                  Cancel
                </ActionButton>
                <ActionButton type="button" onClick={handleRescheduleAppointment} disabled={busy || !selectedRescheduleSlotId}>
                  {busy ? "Rescheduling..." : "Confirm Reschedule"}
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProviderServices({ data, providerServices, onAction, load }) {
  const departments = safeCollection(data?.departments);
  const departmentById = useMemo(() => new Map(departments.map((department) => [String(department.id), department])), [departments]);
  const providerDepartmentId = data?.ownProvider?.department_id ? String(data.ownProvider.department_id) : "";
  const departmentName = displayDepartment(departmentById.get(providerDepartmentId), "Unassigned");
  const services = safeCollection(providerServices);

  const [form, setForm] = useState({
    name: "",
    description: "",
    specialty: "",
    preparation_instructions: "",
    department_id: providerDepartmentId,
    price: "",
  });
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [pendingDeleteService, setPendingDeleteService] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all"); // "all" | "published" | "draft"
  const [searchQuery, setSearchQuery] = useState("");

  const publishedServices = useMemo(() => services.filter((s) => serviceIsPublished(s)), [services]);
  const draftServices = useMemo(() => services.filter((s) => !serviceIsPublished(s)), [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const isPub = serviceIsPublished(service);
      if (serviceFilter === "published" && !isPub) return false;
      if (serviceFilter === "draft" && isPub) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (service.name || "").toLowerCase();
        const spec = (service.specialty || "").toLowerCase();
        const desc = (service.description || "").toLowerCase();
        return name.includes(q) || spec.includes(q) || desc.includes(q);
      }
      return true;
    });
  }, [services, serviceFilter, searchQuery]);

  useEffect(() => {
    if (!editingServiceId && providerDepartmentId && !form.department_id) {
      setForm((current) => ({ ...current, department_id: providerDepartmentId }));
    }
  }, [editingServiceId, providerDepartmentId, form.department_id]);

  const resetForm = () => {
    setEditingServiceId(null);
    setEditingService(null);
    setForm({
      name: "",
      description: "",
      specialty: "",
      preparation_instructions: "",
      department_id: providerDepartmentId,
      price: "",
    });
  };

  const saveService = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");

    try {
      await onAction({
        scope: editingServiceId ? "provider.service.update" : "provider.service.create",
        label: editingServiceId ? "Update service" : "Create service",
        path: editingServiceId ? `/services/${editingServiceId}` : "/services",
        method: editingServiceId ? "PUT" : "POST",
        body: {
          name: form.name,
          description: form.description || null,
          specialty: form.specialty || null,
          preparation_instructions: form.preparation_instructions || null,
          department_id: toNumberOrNull(providerDepartmentId || form.department_id),
          price: safeNumber(form.price),
          is_published: editingService ? Boolean(editingService.is_published) : false,
        },
        successMessage: editingServiceId ? "Service updated" : "Service created",
      });
      resetForm();
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteService = async () => {
    if (!pendingDeleteService) return;
    setBusy(true);
    setNotice("");
    try {
      await onAction({
        scope: "provider.service.delete",
        label: "Delete service",
        path: `/services/${pendingDeleteService.id}`,
        method: "DELETE",
        successMessage: "Service removed from catalog",
      });
      setPendingDeleteService(null);
      if (editingServiceId === pendingDeleteService.id) resetForm();
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (service) => {
    setBusy(true);
    setNotice("");
    try {
      await onAction({
        scope: "provider.service.publish",
        label: service.is_published ? "Unpublish service" : "Publish service",
        path: `/services/${service.id}/${service.is_published ? "unpublish" : "publish"}`,
        method: "POST",
        body: {},
        successMessage: service.is_published ? "Service unpublished" : "Service published",
      });
      setNotice(service.is_published ? "Unpublishing started. Refreshing service status." : "Publishing started. Refreshing service status.");
      void load().catch((error) => setNotice(error.message));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (service) => {
    setEditingServiceId(service.id);
    setEditingService(service);
    setForm({
      name: service.name || "",
      description: service.description || "",
      specialty: service.specialty || "",
      preparation_instructions: service.preparation_instructions || "",
      department_id: String(service.department_id || providerDepartmentId || ""),
      price: service.price !== undefined && service.price !== null ? String(service.price) : "",
    });
  };

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-full flex-col">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#168479]">
              <Stethoscope size={15} /> Services
            </div>
            <h2 className="mt-0.5 text-[18px] font-bold tracking-[-0.02em] text-[#173b4a]">Clinical service studio</h2>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-[#d9e7e2] bg-[#fbfdfc] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#106963] transition hover:bg-[#e7f5f2]"
          >
            Refresh
          </button>
        </header>

        {/* Interactive Stats Strip */}
        <div className="grid grid-cols-2 border-b border-[#d9e7e2] sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setServiceFilter("all")}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
              serviceFilter === "all" ? "bg-slate-50/60" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#0f766e]">
              <Stethoscope size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{services.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Total services</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setServiceFilter("published")}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-emerald-50/60 ${
              serviceFilter === "published" ? "bg-emerald-50/50" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Globe size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{publishedServices.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Published</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setServiceFilter("draft")}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-amber-50/60 sm:border-r ${
              serviceFilter === "draft" ? "bg-amber-50/50" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <FileText size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{draftServices.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Draft / Offline</p>
            </div>
          </button>

          <div className="flex items-center gap-3 px-4 py-3 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Building2 size={17} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold text-[#173b4a] leading-none">{departmentName}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Department</p>
            </div>
          </div>
        </div>

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid min-h-0 flex-1 gap-3.5 p-3.5 xl:grid-cols-[minmax(310px,0.85fr)_minmax(0,1.15fr)]">
          {/* Left Panel: Service Studio Form */}
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#fbfdfc] p-4 shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#168479]">
                      {editingServiceId ? "Service Editor" : "New Service"}
                    </p>
                    {editingServiceId ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Editing #{editingServiceId}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Draft Mode
                      </span>
                    )}
                  </div>
                  <h3 className="mt-0.5 text-[15px] font-bold text-[#173b4a]">
                    {editingServiceId ? "Update service details" : "Configure new clinical service"}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Define services offered under your provider care portfolio.
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#0f766e]">
                  {editingServiceId ? <Edit3 size={16} /> : <Plus size={18} />}
                </div>
              </div>

              <form onSubmit={saveService} className="mt-4 space-y-3.5">
                <Field
                  label="Service name"
                  value={form.name}
                  onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                  placeholder="e.g. Cardiovascular Consultation"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Specialty focus"
                    value={form.specialty}
                    onChange={(value) => setForm((current) => ({ ...current, specialty: value }))}
                    placeholder="e.g. Cardiology"
                  />
                  <Field
                    label="Fee ($)"
                    type="number"
                    value={form.price}
                    onChange={(value) => setForm((current) => ({ ...current, price: value }))}
                    placeholder="120.00"
                  />
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Patient-facing description
                  </span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                    placeholder="Describe what patients can expect during this visit..."
                    className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Preparation instructions
                  </span>
                  <input
                    type="text"
                    value={form.preparation_instructions}
                    onChange={(e) => setForm((current) => ({ ...current, preparation_instructions: e.target.value }))}
                    placeholder="e.g. Fast for 8 hours prior to visit"
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-xs text-slate-900 outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                {!providerDepartmentId ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Your provider profile needs an assigned department. Please set it in the Profile tab first.
                  </div>
                ) : null}

                {notice ? (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <AlertCircle size={15} className="shrink-0 text-rose-600" />
                    <span>{notice}</span>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <ActionButton
                    type="submit"
                    disabled={busy || !departments.length || !form.name || !providerDepartmentId}
                    className="flex-1"
                  >
                    {busy ? "Saving service..." : editingServiceId ? "Save service changes" : "Create & add service"}
                  </ActionButton>

                  {editingServiceId ? (
                    <ActionButton type="button" tone="secondary" onClick={resetForm} disabled={busy}>
                      <X size={14} /> Cancel edit
                    </ActionButton>
                  ) : null}
                </div>
              </form>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Catalog status</p>
              <p className="mt-0.5">
                {publishedServices.length} of {services.length} services are currently published and visible for booking.
              </p>
            </div>
          </section>

          {/* Right Panel: Service Catalog */}
          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9e7e2] pb-3.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setServiceFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    serviceFilter === "all" ? "bg-[#0f766e] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All ({services.length})
                </button>
                <button
                  type="button"
                  onClick={() => setServiceFilter("published")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    serviceFilter === "published" ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Published ({publishedServices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setServiceFilter("draft")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    serviceFilter === "draft" ? "bg-amber-700 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Draft ({draftServices.length})
                </button>
              </div>

              <div className="relative min-w-[170px] flex-1 sm:max-w-[240px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter service or specialty..."
                  className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs outline-none transition focus:border-[#0f766e] focus:bg-white"
                />
              </div>
            </div>

            {/* Service Cards List */}
            <div className="mt-3.5 max-h-[540px] min-h-0 flex-1 overflow-y-auto pr-1 space-y-3 [overscroll-behavior:contain]">
              {filteredServices.map((service) => {
                const isPub = serviceIsPublished(service);
                const serviceDepartment = displayDepartment(departmentById.get(String(service.department_id)), "Unassigned");
                const isCurrentEdit = String(editingServiceId) === String(service.id);

                return (
                  <article
                    key={service.id}
                    className={`group flex flex-col justify-between gap-3.5 rounded-2xl border p-4 transition-all hover:shadow-xs sm:flex-row sm:items-center ${
                      isCurrentEdit
                        ? "border-[#0f766e] bg-[#e7f5f2]/40 ring-2 ring-emerald-100"
                        : "border-slate-200/90 bg-[#fbfdfc] hover:border-[#8ccfc1]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-[#173b4a]">
                          {displayService(service, "Service")}
                        </span>
                        {service.specialty ? (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {service.specialty}
                          </span>
                        ) : null}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            isPub
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isPub ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                          {isPub ? "Published" : "Draft"}
                        </span>
                      </div>

                      <p className="mt-1.5 max-w-xl text-xs text-slate-600 leading-5">
                        {service.description || "No public description provided."}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Building2 size={13} className="text-[#0f766e]" />
                          {serviceDepartment}
                        </span>
                        {service.preparation_instructions ? (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50/80 px-2 py-0.5 text-[11px] font-semibold text-[#0f766e]">
                              <FileText size={12} /> Prep: {service.preparation_instructions}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-center">
                      <button
                        type="button"
                        onClick={() => beginEdit(service)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#0f766e] hover:text-[#0f766e]"
                      >
                        <Edit3 size={13} />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => togglePublish(service)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                          isPub
                            ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                            : "bg-[#0f766e] text-white hover:bg-[#0b665f]"
                        }`}
                      >
                        <Globe size={13} />
                        {isPub ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPendingDeleteService(service)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        title="Delete service"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </article>
                );
              })}

              {!filteredServices.length ? (
                <div className="py-6">
                  <EmptyState
                    icon={services.length ? Filter : Stethoscope}
                    title={services.length ? "No matching services" : "No services configured yet"}
                    detail={
                      services.length
                        ? "Try clearing your search query or switching filters."
                        : "Use the studio form on the left to define your first clinical service."
                    }
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Delete Service Confirmation Modal */}
        {pendingDeleteService ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">Delete Clinical Service</h3>
                  <p className="text-xs text-slate-500">
                    Service #{pendingDeleteService.id} · {displayService(pendingDeleteService, "Service")}
                  </p>
                </div>
              </div>

              {notice ? (
                <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  {notice}
                </p>
              ) : null}

              <p className="mt-4 text-xs leading-relaxed text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">{displayService(pendingDeleteService, "this service")}</strong> from the clinical catalog? This will unpublish the service and soft delete it.
              </p>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <ActionButton
                  type="button"
                  tone="secondary"
                  onClick={() => setPendingDeleteService(null)}
                  disabled={busy}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="button"
                  tone="danger"
                  onClick={confirmDeleteService}
                  disabled={busy}
                >
                  {busy ? "Deleting..." : "Confirm Delete"}
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProviderPatients({ data, context, load }) {
  const appointments = safeCollection(context?.appointments);
  const slots = safeCollection(context?.slots);
  const patients = safeCollection(context?.patients);
  const services = safeCollection(data?.services);
  const serviceById = useMemo(() => new Map(services.map((s) => [String(s.id), s])), [services]);
  const slotById = useMemo(() => new Map(slots.map((s) => [String(s.id), s])), [slots]);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [patientFilter, setPatientFilter] = useState("ALL"); // "ALL" | "UPCOMING" | "PAST"

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patients.filter((row) => {
      if (patientFilter === "UPCOMING" && !row.nextSlot) return false;
      if (patientFilter === "PAST" && row.nextSlot) return false;
      if (!query) return true;
      return `${row.id} ${row.name || ""} ${row.email || ""} ${row.lastVisit || ""}`.toLowerCase().includes(query);
    });
  }, [patients, search, patientFilter]);

  useEffect(() => {
    if (!rows.length) {
      if (selectedId) setSelectedId("");
      return;
    }
    const selectedExists = rows.some((row) => String(row.id) === String(selectedId));
    if (!selectedExists) setSelectedId(String(rows[0].id));
  }, [rows, selectedId]);

  const selected = rows.find((row) => String(row.id) === String(selectedId)) || rows[0] || null;
  const upcoming = appointments.filter((item) => !["CANCELLED", "COMPLETED"].includes(String(item?.status || "").toUpperCase())).length;
  const completed = appointments.filter((item) => String(item?.status || "").toUpperCase() === "COMPLETED").length;

  const selectedPatientAppointments = useMemo(() => {
    if (!selected) return [];
    return appointments
      .filter((a) => String(a.patient_id) === String(selected.id))
      .sort((a, b) => appointmentTime(b, slots) - appointmentTime(a, slots));
  }, [selected, appointments, slots]);

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-full flex-col">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#168479]">
              <Users size={15} /> Patients
            </div>
            <h2 className="mt-0.5 text-[18px] font-bold tracking-[-0.02em] text-[#173b4a]">Clinical patient roster</h2>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-[#d9e7e2] bg-[#fbfdfc] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#106963] transition hover:bg-[#e7f5f2]"
          >
            Refresh roster
          </button>
        </header>

        {/* Interactive KPI Strip */}
        <div className="grid grid-cols-3 border-b border-[#d9e7e2]">
          <button
            type="button"
            onClick={() => setPatientFilter("ALL")}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
              patientFilter === "ALL" ? "bg-slate-50/60" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#0f766e]">
              <Users size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{patients.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Connected patients</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPatientFilter("UPCOMING")}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-emerald-50/60 ${
              patientFilter === "UPCOMING" ? "bg-emerald-50/50" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CalendarDays size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{upcoming}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Upcoming visits</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPatientFilter("PAST")}
            className={`flex items-center gap-3 px-4 py-3 text-left transition hover:bg-sky-50/60 ${
              patientFilter === "PAST" ? "bg-sky-50/50" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <CheckCircle2 size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{completed}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Completed care</p>
            </div>
          </button>
        </div>

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          {/* Left: Patient List Directory */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-slate-200 p-3.5 lg:border-b-0 lg:border-r">
            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, or patient ID..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs outline-none transition focus:border-[#0f766e] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPatientFilter("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    patientFilter === "ALL" ? "bg-[#0f766e] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All ({patients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPatientFilter("UPCOMING")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    patientFilter === "UPCOMING" ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  onClick={() => setPatientFilter("PAST")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    patientFilter === "PAST" ? "bg-sky-700 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Past Care
                </button>
              </div>
            </div>

            {/* Patients List */}
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 space-y-2 [overscroll-behavior:contain]">
              {rows.map((patient) => {
                const isSelected = String(selected?.id) === String(patient.id);
                const initials = getInitials(patient.name || `P ${patient.id}`);
                const hasUpcoming = Boolean(patient.nextSlot);

                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedId(String(patient.id))}
                    className={`group relative flex w-full flex-col gap-2 rounded-2xl border p-3 text-left transition-all sm:flex-row sm:items-center sm:justify-between ${
                      isSelected
                        ? "border-[#0f766e] bg-[#e7f5f2]/40 shadow-xs ring-1 ring-emerald-100"
                        : "border-slate-200/90 bg-white hover:border-[#8ccfc1] hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                          isSelected ? "bg-[#0f766e] text-white" : "bg-emerald-100/80 text-[#0f766e] border border-emerald-200"
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[14px] font-bold text-slate-900">
                            {patient.name || `Patient ${patient.id}`}
                          </p>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                            ID #{patient.id}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {patient.email || "No email on record"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                      {hasUpcoming ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#0f766e]">
                          <Clock3 size={11} /> {patient.nextSlot}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {patient.lastVisit ? `Last: ${patient.lastVisit}` : "No visits recorded"}
                        </span>
                      )}
                      <StatusPill value={patient.currentStatus || "Active"} tone={statusTone(patient.currentStatus)} />
                    </div>
                  </button>
                );
              })}

              {!rows.length ? (
                <div className="py-8">
                  <EmptyState
                    icon={Users}
                    title="No matching patients found"
                    detail="Patients connected to your scheduled appointments and clinical visits will appear here."
                  />
                </div>
              ) : null}
            </div>
          </section>

          {/* Right: Selected Patient Dossier */}
          <aside className="w-full shrink-0 p-4 lg:max-h-[720px] lg:overflow-y-auto space-y-4">
            {selected ? (
              <>
                {/* Patient Profile Card */}
                <div className="flex items-center gap-3.5 border-b border-[#d9e7e2] pb-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-base font-extrabold text-[#0f766e] border border-emerald-200">
                    {getInitials(selected.name || `P ${selected.id}`)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-[16px] font-extrabold text-[#173b4a]">
                        {selected.name || `Patient ${selected.id}`}
                      </h3>
                      <StatusPill value={selected.currentStatus || "Active"} tone={statusTone(selected.currentStatus)} />
                    </div>
                    <p className="truncate text-xs text-slate-500 mt-0.5">
                      {selected.email || "No contact email linked"} · Patient #{selected.id}
                    </p>
                  </div>
                </div>

                {/* Key Overview Metrics */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Total Visits</p>
                    <p className="mt-1 text-[17px] font-extrabold text-[#173b4a]">{selected.count}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Next Visit</p>
                    <p className="mt-1 text-xs font-bold text-[#0f766e] truncate">
                      {selected.nextSlot || "None scheduled"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Last Encounter</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {selected.lastVisit || "No prior visit documented"}
                    </p>
                  </div>
                </div>

                {/* Connected Appointments History Timeline */}
                <div className="rounded-2xl border border-slate-200 bg-[#fbfdfc] p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#168479]">
                    Connected Visit History ({selectedPatientAppointments.length})
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Documented bookings and care consultations</p>

                  <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {selectedPatientAppointments.map((appt) => {
                      const slot = slotById.get(String(appt.slot_id));
                      const service = slot ? serviceById.get(String(slot.service_id)) : null;
                      const timeStr = slot?.start_datetime ? formatDateTime(slot.start_datetime) : formatDateTime(appt.start_time || appt.created_at);

                      return (
                        <div
                          key={appt.id}
                          className="rounded-xl border border-slate-200/80 bg-white p-2.5 transition hover:border-[#8ccfc1]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {displayService(service, "Booked Consultation")}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Clock3 size={11} className="text-[#0f766e]" /> {timeStr}
                              </p>
                            </div>
                            <StatusPill value={appt.status} tone={statusTone(appt.status)} />
                          </div>
                        </div>
                      );
                    })}

                    {!selectedPatientAppointments.length ? (
                      <p className="text-xs text-slate-500 py-3 text-center">No appointment records for this patient.</p>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState icon={Users} title="No patient selected" detail="Select a patient from the roster to inspect their dossier and care timeline." />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProviderVisits({ data, context, onAction, load }) {
  const appointments = safeCollection(context?.appointments);
  const slots = safeCollection(context?.slots);
  const patients = safeCollection(data?.patients);
  const providers = safeCollection(context?.providers);
  const services = safeCollection(data?.services);

  const slotById = useMemo(() => new Map(slots.map((slot) => [String(slot.id), slot])), [slots]);
  const patientById = useMemo(() => new Map(patients.map((patient) => [String(patient.id), patient])), [patients]);
  const serviceById = useMemo(() => new Map(services.map((service) => [String(service.id), service])), [services]);
  const providerById = useMemo(() => new Map(providers.map((provider) => [String(provider.id), provider])), [providers]);

  const [appointmentId, setAppointmentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState("");

  const orderedAppointments = useMemo(
    () => [...appointments].sort((left, right) => appointmentTime(left, slots) - appointmentTime(right, slots)),
    [appointments, slots]
  );

  const filteredAppointments = useMemo(() => {
    return orderedAppointments.filter((appointment) => {
      const visitStatus = String(appointment.visit_status || "NOT_STARTED").toUpperCase();
      const appointmentStatus = String(appointment.status || "").toUpperCase();
      const isTerminal = ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointmentStatus) || visitStatus === "COMPLETED";

      if (filter === "ACTIVE" && isTerminal) return false;
      if (filter === "WAITING" && (visitStatus !== "NOT_STARTED" || isTerminal)) return false;
      if (filter === "IN_CARE" && !["CHECKED_IN", "IN_PROGRESS"].includes(visitStatus)) return false;
      if (filter === "DONE" && !isTerminal) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pt = patientById.get(String(appointment.patient_id));
        const ptName = (displayPerson(pt, "") || "").toLowerCase();
        const s = appointmentLabel(appointment, slotById, serviceById, providerById).service.toLowerCase();
        return ptName.includes(q) || s.includes(q) || String(appointment.id).includes(q);
      }
      return true;
    });
  }, [filter, orderedAppointments, searchQuery, patientById, slotById, serviceById, providerById]);

  useEffect(() => {
    if (!filteredAppointments.length) {
      if (appointmentId) setAppointmentId("");
      return;
    }
    const selectedExists = filteredAppointments.some((item) => String(item.id) === String(appointmentId));
    if (!selectedExists) setAppointmentId(String(filteredAppointments[0].id));
  }, [appointmentId, filteredAppointments]);

  const selected = filteredAppointments.find((item) => String(item.id) === String(appointmentId)) || filteredAppointments[0] || orderedAppointments[0] || null;
  const selectedSlot = selected ? slotById.get(String(selected.slot_id)) || null : null;
  const selectedPatient = selected ? patientById.get(String(selected.patient_id)) || null : null;
  const selectedService = selectedSlot ? serviceById.get(String(selectedSlot.service_id)) || null : null;
  const visitStatus = String(selected?.visit_status || "NOT_STARTED").toUpperCase();
  const terminal = ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(String(selected?.status || "").toUpperCase()) || visitStatus === "COMPLETED";

  const run = async (path, label, body) => {
    if (!selected || busy) return;
    setBusy(true);
    setNotice("");
    try {
      await onAction({
        scope: "provider.visit",
        label,
        path: path === "state" ? `/appointments/${selected.id}/state` : `/appointments/${selected.id}/${path}`,
        method: path === "state" ? "GET" : "POST",
        body,
        successMessage: label,
      });
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const waiting = appointments.filter((item) => String(item.visit_status || "NOT_STARTED").toUpperCase() === "NOT_STARTED" && !["CANCELLED", "COMPLETED"].includes(String(item.status || "").toUpperCase()));
  const checkedIn = appointments.filter((item) => String(item.visit_status || "").toUpperCase() === "CHECKED_IN");
  const inProgress = appointments.filter((item) => String(item.visit_status || "").toUpperCase() === "IN_PROGRESS");
  const completed = appointments.filter((item) => String(item.visit_status || "").toUpperCase() === "COMPLETED" || String(item.status || "").toUpperCase() === "COMPLETED");

  const selectedPatientName = selected ? displayPerson(selectedPatient, `Patient #${selected.patient_id}`) : "";
  const selectedInitials = getInitials(selectedPatientName);

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-full flex-col">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#168479]">
              <Activity size={15} /> Clinical flow
            </div>
            <h2 className="mt-0.5 text-[18px] font-bold tracking-[-0.02em] text-[#173b4a]">Clinical visit workspace</h2>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-[#d9e7e2] bg-[#fbfdfc] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#106963] transition hover:bg-[#e7f5f2]"
          >
            Refresh queue
          </button>
        </header>

        {/* Interactive KPI Strip */}
        <div className="grid grid-cols-2 border-b border-[#d9e7e2] sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setFilter("WAITING")}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-amber-50/60 ${
              filter === "WAITING" ? "bg-amber-50/50" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Clock3 size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{waiting.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Waiting</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilter("IN_CARE")}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50/60 ${
              filter === "IN_CARE" ? "bg-sky-50/50" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <CalendarDays size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{checkedIn.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Checked in</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilter("IN_CARE")}
            className={`flex items-center gap-3 border-r border-slate-100 px-4 py-3 text-left transition hover:bg-teal-50/60 sm:border-r`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Activity size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{inProgress.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">In consultation</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilter("DONE")}
            className={`flex items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/60 ${
              filter === "DONE" ? "bg-emerald-50/50" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-extrabold text-[#173b4a] leading-none">{completed.length}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Completed</p>
            </div>
          </button>
        </div>

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid min-h-0 flex-1 gap-3.5 p-3.5 lg:grid-cols-[minmax(310px,0.92fr)_minmax(0,1.08fr)]">
          {/* Left: Clinical Queue List */}
          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-[#fbfdfc] p-4 shadow-sm">
            {/* Filter Pills & Counter */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9e7e2] pb-3.5">
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                <QueueFilter label="Active" value="ACTIVE" current={filter} onClick={setFilter} />
                <QueueFilter label="Waiting" value="WAITING" current={filter} onClick={setFilter} />
                <QueueFilter label="In Care" value="IN_CARE" current={filter} onClick={setFilter} />
                <QueueFilter label="Done" value="DONE" current={filter} onClick={setFilter} />
              </div>
              <span className="text-xs font-semibold text-slate-500">{filteredAppointments.length} visits</span>
            </div>

            {/* Real-time search */}
            <div className="mt-3 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, service, or appointment ID..."
                className="h-8 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none transition focus:border-[#0f766e]"
              />
            </div>

            {/* Queue Cards */}
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 space-y-2 [overscroll-behavior:contain]">
              {filteredAppointments.map((appointment) => {
                const itemStatus = String(appointment.visit_status || "NOT_STARTED").toUpperCase();
                const itemPatient = patientById.get(String(appointment.patient_id));
                const ptName = displayPerson(itemPatient, `Patient #${appointment.patient_id}`);
                const isCurrent = String(selected?.id) === String(appointment.id);
                const summary = appointmentLabel(appointment, slotById, serviceById, providerById);

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => setAppointmentId(String(appointment.id))}
                    className={`group relative flex w-full flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all sm:flex-row sm:items-center sm:justify-between ${
                      isCurrent
                        ? "border-[#0f766e] bg-[#e7f5f2]/40 shadow-xs ring-1 ring-emerald-100"
                        : "border-slate-200/90 bg-white hover:border-[#8ccfc1] hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                          isCurrent
                            ? "bg-[#0f766e] text-white"
                            : "bg-emerald-100/80 text-[#0f766e] border border-emerald-200"
                        }`}
                      >
                        {getInitials(ptName)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[14px] font-bold text-slate-900">{ptName}</p>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                            #{appointment.id}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-600">{summary.service}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-[#0f766e] font-semibold">
                          <Clock3 size={11} />
                          {summary.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:self-center">
                      <StatusPill value={itemStatus.replaceAll("_", " ")} tone={statusTone(itemStatus)} />
                    </div>
                  </button>
                );
              })}

              {!filteredAppointments.length ? (
                <div className="py-8">
                  <EmptyState
                    icon={Activity}
                    title="No visits match filter"
                    detail="Patients scheduled for appointments will appear here as they book."
                  />
                </div>
              ) : null}
            </div>
          </section>

          {/* Right: Clinical Care Workspace */}
          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {selected ? (
              <div className="space-y-4">
                {/* Patient Care Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9e7e2] pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-base font-extrabold text-[#0f766e] border border-emerald-200">
                      {selectedInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-extrabold text-[#173b4a]">
                          {selectedPatientName}
                        </h3>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                          Appt #{selected.id}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {selectedPatient?.email || "Patient contact details unavailable"}
                      </p>
                    </div>
                  </div>
                  <StatusPill value={selected.status} tone={statusTone(selected.status)} />
                </div>

                {/* Clinical Context Cards */}
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Service</p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-900">
                      {displayService(selectedService, "Clinical Consultation")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Scheduled Time</p>
                    <p className="mt-1 truncate text-xs font-bold text-[#0f766e]">
                      {formatDateTime(selectedSlot?.start_datetime || selected.start_time || selected.created_at)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Visit Status</p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-900">
                      {visitStatus.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>

                {/* Care Progression Stepper */}
                <div className="rounded-2xl border border-slate-200 bg-[#fbfdfc] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#168479]">
                    Care progression stepper
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <ProgressStep
                      label="1. Check-in"
                      active={visitStatus === "NOT_STARTED" && !terminal}
                      done={["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(visitStatus)}
                    />
                    <ProgressStep
                      label="2. In Care"
                      active={visitStatus === "CHECKED_IN" || visitStatus === "IN_PROGRESS"}
                      done={visitStatus === "COMPLETED"}
                    />
                    <ProgressStep
                      label="3. Concluded"
                      active={visitStatus === "COMPLETED" || terminal}
                      done={visitStatus === "COMPLETED"}
                    />
                  </div>
                </div>

                {/* Primary Next Clinical Action Spotlight */}
                <div className="rounded-2xl border border-[#d9e7e2] bg-gradient-to-br from-[#f8fbfb] to-[#f0f8f6] p-4 shadow-xs">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#168479]">
                        Recommended Next Action
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#173b4a]">
                        {terminal
                          ? "This consultation has been closed."
                          : visitStatus === "NOT_STARTED"
                          ? "Check in patient and verify arrival"
                          : visitStatus === "CHECKED_IN"
                          ? "Commence consultation and clinical exam"
                          : visitStatus === "IN_PROGRESS"
                          ? "Finalize visit and discharge patient"
                          : "Visit concluded"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {terminal
                          ? "No further clinical actions required."
                          : "Advance the appointment to the next care stage."}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {!terminal && visitStatus === "NOT_STARTED" ? (
                        <ActionButton
                          onClick={() => run("visit/check-in", "Check in", {})}
                          disabled={busy}
                          className="w-full sm:w-auto"
                        >
                          <UserCheck size={16} /> Check In Patient
                        </ActionButton>
                      ) : null}

                      {!terminal && visitStatus === "CHECKED_IN" ? (
                        <ActionButton
                          onClick={() => run("visit/start", "Start visit", {})}
                          disabled={busy}
                          className="w-full sm:w-auto"
                        >
                          <Activity size={16} /> Start Consultation
                        </ActionButton>
                      ) : null}

                      {!terminal && visitStatus === "IN_PROGRESS" ? (
                        <ActionButton
                          onClick={() => run("visit/complete", "Complete visit", {})}
                          disabled={busy}
                          className="w-full sm:w-auto"
                        >
                          <CheckCircle2 size={16} /> Complete & Discharge
                        </ActionButton>
                      ) : null}
                    </div>
                  </div>

                  {/* Secondary Clinical Utilities */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3">
                    <ActionButton
                      tone="secondary"
                      onClick={() => run("billing/pre-check", "Billing pre-check", {})}
                      disabled={busy || terminal}
                      className="text-xs"
                    >
                      Billing Pre-check
                    </ActionButton>

                    {!terminal ? (
                      <ActionButton
                        tone="danger"
                        onClick={() => run("no-show", "Mark no-show", {})}
                        disabled={busy}
                        className="text-xs"
                      >
                        Mark No-Show
                      </ActionButton>
                    ) : null}

                    <ActionButton
                      tone="secondary"
                      onClick={() => run("state", "Refresh state")}
                      disabled={busy}
                      className="text-xs"
                    >
                      Refresh State
                    </ActionButton>
                  </div>

                  {notice ? (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      <AlertCircle size={15} className="shrink-0 text-rose-600" />
                      <span>{notice}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No appointment selected"
                detail="Choose a booked visit from the queue on the left to review patient details and advance clinical care."
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function getProviderContext(data) {
  const providerId = data?.ownProvider?.id;
  const appointments = providerId ? safeCollection(data?.appointments).filter((item) => String(item.provider_id) === String(providerId)) : [];
  const slots = providerId ? safeCollection(data?.slots).filter((slot) => String(slot.provider_id) === String(providerId)) : [];
  const patients = buildProviderPatients(appointments, safeCollection(data?.patients), slots, safeCollection(data?.providers));
  return { providerId, appointments, slots, patients, providers: safeCollection(data?.providers), departments: safeCollection(data?.departments) };
}

function getProviderServices(data) {
  return safeCollection(data?.providerServices);
}

function serviceIsPublished(service) {
  return String(service.status || "").toUpperCase() === "PUBLISHED" || Boolean(service.is_published);
}

function buildProviderPatients(appointments, patientRecords, slots, providers = []) {
  const grouped = new Map();
  const providerById = new Map(providers.map((provider) => [String(provider.id), provider]));

  for (const appointment of appointments) {
    const patientId = String(appointment.patient_id || "unknown");
    const slot = slots.find((item) => String(item.id) === String(appointment.slot_id));
    const patientRecord = patientRecords.find((item) => String(item.id) === patientId);
    const provider = slot ? providerById.get(String(slot.provider_id)) : null;
    const current = grouped.get(patientId) || {
      id: patientId,
      name: displayPerson(patientRecord, `Patient ${patientId}`),
      email: patientRecord?.email || "",
      count: 0,
      lastVisit: "",
      nextSlot: "",
      currentStatus: appointment.status || "PENDING",
      lastSort: 0,
    };

    const visitDate = parseDate(slot?.start_datetime || appointment.start_time || appointment.scheduled_at || appointment.created_at);
    const visitTime = visitDate ? visitDate.getTime() : 0;
    const display = formatDateTime(slot?.start_datetime || appointment.start_time || appointment.scheduled_at || appointment.created_at);

    current.count += 1;
    current.currentStatus = appointment.status || current.currentStatus;
    current.providerName = displayPerson(provider, current.providerName || "Assigned provider");
    if (!current.lastSort || visitTime >= current.lastSort) {
      current.lastSort = visitTime;
      current.lastVisit = display;
    }
    if (!current.nextSlot && !["CANCELLED", "COMPLETED"].includes(String(appointment.status).toUpperCase())) {
      current.nextSlot = display;
    }

    grouped.set(patientId, current);
  }

  return Array.from(grouped.values()).sort((left, right) => right.lastSort - left.lastSort);
}

function ProviderShell({ eyebrow, title, detail, icon: Icon, refresh, children }) {
  return (
    <section className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#168479]">
            <Icon size={14} />
            {eyebrow}
          </div>
          <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-[#173b4a]">{title}</h2>
          {detail ? <p className="mt-1 max-w-2xl text-[13px] text-slate-500">{detail}</p> : null}
        </div>
        <button type="button" onClick={refresh} className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3.5 text-[12px] font-semibold text-[#106963] hover:bg-slate-50">
          Refresh
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#fbfdfc] p-3.5">
      <Icon size={15} className="text-[#168479]" />
      <p className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-[#173b4a]">{value}</p>
      <p className="mt-0.5 text-[12px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

function ScheduleStat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 border-r border-slate-100 px-4 py-3 last:border-r-0">
      <Icon size={14} className="shrink-0 text-[#168479]" />
      <div className="min-w-0"><p className="text-[16px] font-semibold text-[#173b4a]">{value}</p><p className="truncate text-[11px] uppercase tracking-[0.1em] text-slate-500">{label}</p></div>
    </div>
  );
}

function ClinicalStat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 border-r border-slate-100 px-4 py-3 last:border-r-0">
      <Icon size={14} className="shrink-0 text-[#168479]" />
      <div className="min-w-0"><p className="text-[16px] font-semibold text-[#173b4a]">{value}</p><p className="truncate text-[11px] uppercase tracking-[0.1em] text-slate-500">{label}</p></div>
    </div>
  );
}

function QueueFilter({ label, value, current, onClick }) {
  return <button type="button" onClick={() => onClick(value)} className={`shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${current === value ? "bg-[#0f766e] text-white" : "text-slate-500 hover:bg-slate-100"}`}>{label}</button>;
}

function ProgressStep({ label, active, done }) {
  return <div className={`rounded-xl border px-2.5 py-2.5 text-center ${active ? "border-[#0f766e] bg-[#e7f5f2] text-[#0f766e]" : done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}><div className="mx-auto h-2 w-2 rounded-full bg-current" /><p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</p></div>;
}

function Field({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={label}
        aria-disabled={disabled}
        className="h-10 w-full rounded-2xl border border-slate-200 bg-white shadow-sm px-3.5 text-[13px] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, placeholder, children, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={label}
        aria-disabled={disabled}
        className="h-10 w-full rounded-2xl border border-slate-200 bg-white shadow-sm px-3.5 text-[13px] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </label>
  );
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(value, reference) {
  const date = parseDate(value);
  if (!date) return false;
  return date.toDateString() === reference.toDateString();
}

function findSlot(appointment, slots) {
  return slots.find((slot) => String(slot.id) === String(appointment.slot_id));
}

function appointmentTime(appointment, slots) {
  return parseDate(findSlot(appointment, slots)?.start_datetime || appointment.start_time || appointment.scheduled_at || appointment.created_at)?.getTime() || Number.MAX_SAFE_INTEGER;
}

function toLocalInput(value) {
  const date = parseDate(value);
  if (!date) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
