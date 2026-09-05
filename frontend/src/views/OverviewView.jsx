import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { ActionButton, EmptyState, StatusPill } from "../components/ui";
import { formatDateTime, shortId, statusTone } from "../lib/workspace";

const BOARD_CONFIG = {
  patient: {
    title: "",
    action: "Find care",
    queueTitle: "Booking status",
    tableTitle: "Booking history",
    emptyTitle: "No bookings yet",
    emptyDetail: "Create your first appointment from the booking panel.",
  },
  provider: {
    title: "Schedule",
    action: "Add slot",
    queueTitle: "Visit flow",
    tableTitle: "My appointments",
    emptyTitle: "No appointments yet",
    emptyDetail: "Appointments will appear here after a patient books a slot.",
  },
  front_desk: {
    title: "Desk queue",
    action: "Register patient",
    queueTitle: "Check-ins",
    tableTitle: "Patients",
    emptyTitle: "No patients yet",
    emptyDetail: "Register a patient to start the front desk workflow.",
  },
  admin: {
    title: "Appointments",
    action: "Add appointment",
    queueTitle: "Queue Status",
    tableTitle: "All Patients",
    emptyTitle: "No records yet",
    emptyDetail: "Activity will appear once the backend is exercised.",
  },
};

const WEEKDAY_COUNT = 7;
const CLINIC_START_HOUR = 8;
const CLINIC_END_HOUR = 22;
const ROWS_PER_PAGE = 5;

export function OverviewView({ role, session, data, onNavigate }) {
  const [timePage, setTimePage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("week");
  const [searchTerm, setSearchTerm] = useState("");
  const today = useMemo(() => new Date(), []);

  const model = useMemo(
    () => buildCalendarModel(role, session, data, statusFilter, searchTerm, viewMode, today),
    [role, session, data, statusFilter, searchTerm, viewMode, today]
  );
  const pageSize = ROWS_PER_PAGE;
  const maxPage = Math.max(0, Math.ceil(model.timeSlots.length / pageSize) - 1);
  const page = Math.min(timePage, maxPage);
  const visibleTimes = model.timeSlots.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    setTimePage(0);
  }, [role, session?.userId, statusFilter, searchTerm, viewMode, data.appointments.length, data.slots.length]);

  return (
    <div className="h-full overflow-hidden rounded-[24px] border border-slate-200 bg-[#f4f7f6] shadow-sm">
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(190px,0.58fr)] gap-1.5 p-2 sm:p-2.5">
        <section className="panel flex min-h-0 flex-col overflow-hidden rounded-[24px] p-3 sm:p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f766e]">
                {role === "patient" ? "Appointments" : `${role.replace("_", " ")} workspace`}
              </p>
              {BOARD_CONFIG[role]?.title ? (
                <h2 className="mt-1 text-[16px] font-medium tracking-tight text-slate-950">
                  {BOARD_CONFIG[role]?.title || "Clinical operations"}
                </h2>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
                }}
                className="inline-flex items-center gap-1.5 rounded-[11px] border border-slate-200 bg-white px-2.5 py-1.25 text-[11px] font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
                title="Quick Search (Ctrl+K)"
              >
                <Search size={12} className="text-[#0f766e]" />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.(role === "patient" ? "Appointments" : role === "provider" ? "Schedule" : role === "front_desk" ? "Desk" : "Catalog")}
                className="inline-flex items-center gap-1.5 rounded-[11px] bg-[#2f80ed] px-2.5 py-1.25 text-[11px] font-medium text-white shadow-sm transition hover:bg-[#276ed0]"
              >
                <span>+</span>
                {BOARD_CONFIG[role]?.action || "Add"}
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex shrink-0 items-center gap-1.5">
              {[
                ["Day", "day"],
                ["Week", "week"],
                ["Month", "month"],
              ].map(([label, mode]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`h-7 shrink-0 rounded-full border px-2.5 text-[10px] font-semibold tracking-tight transition ${
                    viewMode === mode
                      ? "border-slate-200 bg-white text-slate-950 shadow-sm"
                      : "border-transparent bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1.5">
              <div className="flex items-center gap-1">
                <IconButton onClick={() => setTimePage((current) => Math.max(0, current - 1))} disabled={page === 0}>
                  <ChevronLeft size={13} />
                  Prev
                </IconButton>
                <IconButton
                  onClick={() => {
                    setTimePage(0);
                  }}
                >
                  Today
                </IconButton>
                <IconButton
                  onClick={() => setTimePage((current) => Math.min(maxPage, current + 1))}
                  disabled={page === maxPage}
                >
                  Next
                  <ChevronRight size={13} />
                </IconButton>
              </div>

              <button
                type="button"
                onClick={() => setStatusFilter((current) => (current === "all" ? "waiting" : current === "waiting" ? "completed" : "all"))}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[10px] font-semibold tracking-tight text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                title="Cycle appointment filter"
              >
                <Filter size={11} />
                {statusFilter === "all" ? "All" : statusFilter === "waiting" ? "Waiting" : "Completed"}
              </button>

              <label className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 shadow-sm">
                <Search size={11} className="text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search"
                  className="w-[74px] border-none bg-transparent text-[10px] outline-none placeholder:text-slate-400"
                />
              </label>
            </div>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-auto rounded-[18px] border border-slate-200 bg-white" style={{ minHeight: "260px" }}>
            <div
              className="grid h-full min-w-0"
              style={{
                gridTemplateColumns: `52px repeat(${model.days.length}, minmax(0, 1fr))`,
                gridTemplateRows: "36px repeat(5, minmax(0, 1fr))",
              }}
            >
              <div className="border-b border-r border-slate-200 bg-slate-50" />
              {model.days.map((day) => (
                <div
                  key={day.key}
                  className="flex items-center justify-center border-b border-r border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-600 last:border-r-0"
                >
                  {day.label}
                </div>
              ))}

              {visibleTimes.length ? (
                visibleTimes.map((time) => (
                  <div key={time.key} className="contents">
                    <div className="flex items-center justify-center border-r border-b border-slate-200 bg-slate-50 text-[9px] font-medium text-slate-500">
                      {time.label}
                    </div>
                    {model.days.map((day) => {
                      const items = model.cells.get(`${day.key}|${time.key}`) || [];
                      const first = items[0];
                      const extraCount = Math.max(0, items.length - 1);
                      return (
                        <div key={`${day.key}-${time.key}`} className="min-w-0 border-r border-b border-slate-200 bg-[#fcfdfc] p-1 last:border-r-0">
                          {first ? (
                            <div className={`h-full rounded-[10px] border px-2 py-1 text-[9.5px] leading-[1.28] ${first.tone}`}>
                              <p className="font-semibold">{first.title}</p>
                              <p className="mt-0.5 opacity-80">{first.subtitle}</p>
                              {extraCount > 0 ? <p className="mt-[2px] font-semibold opacity-80">+{extraCount} more</p> : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className={`flex items-center justify-center p-4`} style={{ gridColumn: `1 / span ${model.days.length + 1}` }}>
                  <EmptyState
                    icon={CalendarDays}
                    title={BOARD_CONFIG[role]?.emptyTitle || "No entries"}
                    detail={BOARD_CONFIG[role]?.emptyDetail || "There are no calendar entries for this role yet."}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid min-h-0 grid-cols-[minmax(180px,0.3fr)_minmax(0,1fr)] gap-2">
          <div className="panel min-h-0 overflow-y-auto rounded-[24px] p-2.5">
            <div className="flex items-center justify-between gap-2.5">
              <h3 className="text-[13px] font-medium text-slate-950">{BOARD_CONFIG[role]?.queueTitle || "Queue"}</h3>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-[3px] text-[9px] font-medium text-slate-500">
                This day
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-center">
              <Gauge completed={model.queue.completed} inProgress={model.queue.inProgress} waiting={model.queue.waiting} />
            </div>

            <div className="mt-1 space-y-1.5">
              <LegendRow label="Completed" value={model.queue.completed} tone="bg-[#2f80ed]" />
              <LegendRow label="In consultation" value={model.queue.inProgress} tone="bg-[#1d4ed8]" />
              <LegendRow label="Waiting" value={model.queue.waiting} tone="bg-[#cbd5e1]" />
            </div>
          </div>

          <div className="panel min-h-0 overflow-y-auto rounded-[24px] p-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-[13px] font-medium text-slate-950">{BOARD_CONFIG[role]?.tableTitle || "Rows"}</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">Live backend rows, trimmed to fit the demo viewport.</p>
              </div>
              <div className="flex items-center gap-1.5">
                <SearchField value={searchTerm} onChange={setSearchTerm} />
                <IconButton>
                  <Filter size={14} />
                  Filter
                </IconButton>
              </div>
            </div>

            <div className="mt-2 min-w-0 overflow-hidden rounded-[16px] border border-slate-200 bg-white">
              <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_32px] border-b border-slate-200 bg-slate-50 px-3 py-1 text-[9.5px] font-medium text-slate-500">
                {tableColumns(role).map((column) => (
                  <div key={column}>{column}</div>
                ))}
              </div>

              <div className="divide-y divide-slate-200">
                {model.rows.length ? (
                  model.rows.map((row) => (
                    <div
                      key={row.key}
                      className="grid min-w-0 grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_32px] items-center px-3 py-1.5 text-[10px] text-slate-700"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar value={row.avatar} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-950">{row.primary}</p>
                          <p className="truncate text-[10px] text-slate-500">{row.secondary}</p>
                        </div>
                      </div>
                      <div className="truncate">{row.doctor}</div>
                      <div className="truncate">{row.date}</div>
                      <div className="truncate">{row.time}</div>
                      <div>
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                          {row.type}
                        </span>
                      </div>
                      <div>
                        <StatusPill value={row.status} tone={statusTone(row.status)} />
                      </div>
                      <div className="flex justify-end">
                        <ActionButton
                          type="button"
                          tone="secondary"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => onNavigate?.(row.kind === "slot" ? fallbackTab(role) : role === "patient" ? "Appointments" : role === "provider" ? "Visits" : role === "front_desk" ? "Desk" : "Catalog")}
                          aria-label={`Open ${row.primary}`}
                        >
                          Open
                        </ActionButton>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3">
                    <EmptyState
                      icon={CalendarDays}
                      title={BOARD_CONFIG[role]?.emptyTitle || "No records"}
                      detail={BOARD_CONFIG[role]?.emptyDetail || "There are no rows to show yet."}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between text-[9.5px] text-slate-500">
              <button
                type="button"
                onClick={() => onNavigate?.(fallbackTab(role))}
                className="font-semibold text-[#2563eb] transition hover:text-[#1d4ed8]"
              >
                View all {BOARD_CONFIG[role]?.tableTitle?.toLowerCase() || "records"} →
              </button>
              <span className="inline-flex items-center gap-2">
                Prev
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-700">1</span>
                Next
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function buildCalendarModel(role, session, data, statusFilter, searchTerm, viewMode, today) {
  const source = getRoleSource(role, session, data)
    .filter((item) => matchesDateMode(item, viewMode, today))
    .filter((item) => matchesFilter(item, statusFilter))
    .filter((item) => matchesSearch(item, searchTerm));
  const days = buildCalendarDays(source, viewMode, today);
  const timeSlots = buildTimeSlots(source);
  const cells = new Map();

  for (const item of source) {
    const dayKey = item.dayKey;
    const timeKey = item.timeKey;
    const key = `${dayKey}|${timeKey}`;
    const next = cells.get(key) || [];
    next.push(item);
    next.sort((left, right) => left.sortScore - right.sortScore);
    cells.set(key, next);
  }

  const queue = buildQueue(role, data, source);
  const rows = buildTableRows(role, data, source);

  return { days, timeSlots, cells, queue, rows };
}

function getRoleSource(role, session, data) {
  const appointments = (data.appointments || []).map((item) => normalizeAppointment(item));
  const slots = (data.slots || []).map((item) => normalizeSlot(item));
  const patientId = data.patientProfile?.id || session?.userId;
  const providerId = data.ownProvider?.id;

  if (role === "patient") {
    if (!patientId) return [];
    return appointments.filter((item) => String(item.patientId) === String(patientId));
  }

  if (role === "provider") {
    if (!providerId) return [];
    return [
      ...slots.filter((item) => String(item.providerId) === String(providerId)),
      ...appointments.filter((item) => String(item.providerId) === String(providerId)),
    ];
  }

  if (role === "front_desk") {
    return appointments;
  }

  return [...appointments, ...slots];
}

function normalizeAppointment(item) {
  const when = parseDate(item.start_time || item.scheduled_at || item.created_at);
  return {
    kind: "appointment",
    raw: item,
    status: String(item.status || item.visit_status || "PENDING").toUpperCase(),
    title: item.service_name || item.patient_name || item.title || "Appointment",
    subtitle: item.provider_name || `Slot ${shortId(item.slot_id || item.id)}`,
    patientId: item.patient_id,
    providerId: item.provider_id,
    timeKey: when ? timeKey(when) : "unknown",
    dayKey: when ? dayKey(when) : "unknown",
    sortScore: when ? when.getTime() : 0,
    tone: appointmentTone(item),
  };
}

function normalizeSlot(item) {
  const when = parseDate(item.start_datetime || item.start_time || item.created_at);
  return {
    kind: "slot",
    raw: item,
    status: String(item.status || "AVAILABLE").toUpperCase(),
    title: item.status === "AVAILABLE" ? "Slot open" : "Slot reserved",
    subtitle: `${formatDateTime(item.start_datetime || item.start_time || item.created_at)} · ${shortId(item.provider_id)}`,
    providerId: item.provider_id,
    timeKey: when ? timeKey(when) : "unknown",
    dayKey: when ? dayKey(when) : "unknown",
    sortScore: when ? when.getTime() : 0,
    tone: slotTone(item),
  };
}

function matchesFilter(item, statusFilter) {
  if (statusFilter === "all") return true;
  if (statusFilter === "completed") return item.status === "COMPLETED" || String(item.raw?.visit_status).toUpperCase() === "COMPLETED";
  if (statusFilter === "waiting") {
    return ["PENDING", "REQUESTED", "CHECKED_IN", "IN_PROGRESS", "AVAILABLE", "OPEN"].includes(item.status);
  }
  return true;
}

function matchesSearch(item, searchTerm) {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return true;

  const fields = [
    item.raw?.patient_name,
    item.raw?.provider_name,
    item.raw?.service_name,
    item.raw?.title,
    item.title,
    item.subtitle,
    item.status,
    item.raw?.status,
    item.raw?.visit_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return fields.includes(query);
}

function matchesDateMode(item, viewMode, today) {
  const date = parseDate(item.raw?.start_time || item.raw?.start_datetime || item.raw?.scheduled_at || item.raw?.created_at);
  if (!date) return true;

  if (viewMode === "day") {
    return date.toDateString() === today.toDateString();
  }

  if (viewMode === "week") {
    const start = startOfWeek(today);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return date >= start && date < end;
  }

  if (viewMode === "month") {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }

  return true;
}

function buildCalendarDays(source, viewMode, today) {
  const anchor = source.find((item) => item.sortScore)?.sortScore || today.getTime();
  const date = new Date(anchor);

  if (viewMode === "day") {
    return [
      {
        key: dayKey(today),
        label: today.toLocaleDateString([], { weekday: "short", month: "short", day: "2-digit" }),
      },
    ];
  }

  if (viewMode === "month") {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const days = [];
    const cursor = new Date(monthStart);
    while (cursor <= monthEnd) {
      days.push({
        key: dayKey(cursor),
        label: cursor.toLocaleDateString([], { weekday: "short", day: "2-digit" }),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  const dayOffset = (date.getDay() + 6) % 7;
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(date.getDate() - dayOffset);

  return Array.from({ length: WEEKDAY_COUNT }, (_, index) => {
    const current = new Date(weekStart);
    current.setDate(weekStart.getDate() + index);
    return {
      key: dayKey(current),
      label: current.toLocaleDateString([], { weekday: "short", day: "2-digit" }),
    };
  });
}

function buildTimeSlots(source) {
  const times = Array.from({ length: CLINIC_END_HOUR - CLINIC_START_HOUR + 1 }, (_, index) => {
    const hour = CLINIC_START_HOUR + index;
    return `${String(hour).padStart(2, "0")}:00`;
  });

  return times.map((value) => ({
    key: value,
    label: timeLabel(value),
  }));
}

function startOfWeek(reference) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset);
  return start;
}

function buildQueue(role, data, source = []) {
  const appointments = data.appointments || [];
  const scopedAppointments = source.filter((item) => item.kind === "appointment");
  const terminal = ["CANCELLED", "NO_SHOW", "COMPLETED"];
  const completed = scopedAppointments.filter((item) => String(item.status).toUpperCase() === "COMPLETED" || String(item.raw?.visit_status).toUpperCase() === "COMPLETED").length;
  const inProgress = scopedAppointments.filter((item) => ["CHECKED_IN", "IN_PROGRESS"].includes(String(item.raw?.visit_status || item.status).toUpperCase())).length;
  const waiting = scopedAppointments.filter((item) => !terminal.includes(String(item.status).toUpperCase()) && !["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(String(item.raw?.visit_status).toUpperCase())).length;

  if (role === "admin" && data.summary) {
    return {
      completed: Number(data.summary.appointments_completed_total ?? completed),
      inProgress: Number(data.summary.appointments_in_progress_total ?? inProgress),
      waiting: Number(data.summary.appointments_waiting_total ?? waiting),
    };
  }

  return { completed, inProgress, waiting };
}

function buildTableRows(role, data, source) {
  const appointments = data.appointments || [];
  const providers = data.providers || [];
  const patients = data.patients || [];
  const services = data.services || [];

  const doctorFor = (appointment) => {
    const provider = providers.find((item) => String(item.id) === String(appointment.providerId));
    return provider?.full_name || provider?.name || provider?.specialty || "Dr. Rahman";
  };

  const serviceFor = (appointment) => {
    const service = services.find((item) => String(item.id) === String(appointment.raw?.service_id));
    return service?.name || service?.title || "Visit";
  };

  if (role === "front_desk") {
    return (patients.length ? patients : appointments.slice(0, 3)).slice(0, 3).map((item, index) => ({
      key: item.id ?? `patient-${index}`,
      avatar: String(item.id ?? index),
      primary: item.full_name || item.name || item.email || `Patient ${index + 1}`,
      secondary: item.email || item.phone || "Registered patient",
      doctor: item.department_name || "Front desk",
      date: formatDateTime(item.created_at || item.updated_at || item.joined_at),
      time: shortId(item.id),
      type: item.role || "Patient",
      status: item.status || "READY",
    }));
  }

  if (role === "provider") {
    const providerId = data.ownProvider?.id;
    if (!providerId) return [];
    const providerRows = source.filter((item) => item.kind === "slot" || String(item.providerId) === String(providerId));
    return providerRows.slice(0, 3).map((item, index) => ({
      key: item.raw?.id ?? `provider-${index}`,
      avatar: String(item.raw?.patient_id ?? item.raw?.id ?? index),
      primary: item.kind === "slot" ? "Availability" : item.raw?.patient_name || `Patient ${index + 1}`,
      secondary: item.kind === "slot" ? "Schedule" : serviceFor(item),
      doctor: doctorFor(item),
      date: formatDateTime(item.raw?.start_datetime || item.raw?.start_time || item.raw?.scheduled_at || item.raw?.created_at),
      time: item.raw?.status || item.status,
      type: item.kind === "slot" ? shortId(item.raw?.service_id) : item.raw?.visit_status || "Visit",
      status: item.status,
    }));
  }

  if (role === "patient") {
    const patientId = data.patientProfile?.id;
    if (!patientId) return [];
    const patientRows = source.filter((item) => String(item.patientId) === String(patientId));
    return patientRows.slice(0, 3).map((item, index) => ({
      key: item.raw?.id ?? `patient-${index}`,
      avatar: String(item.raw?.id ?? index),
      primary: serviceFor(item),
      secondary: doctorFor(item),
      doctor: doctorFor(item),
      date: formatDateTime(item.raw?.start_time || item.raw?.scheduled_at || item.raw?.created_at),
      time: item.timeKey,
      type: item.raw?.visit_status || "Booking",
      status: item.status,
    }));
  }

  return source.slice(0, 3).map((item, index) => ({
    key: item.raw?.id ?? `row-${index}`,
    avatar: String(item.raw?.id ?? index),
    primary: item.raw?.patient_name || item.raw?.service_name || item.title || `Record ${index + 1}`,
    secondary: item.raw?.provider_name || item.subtitle || "Live row",
    doctor: item.raw?.provider_name || "Dr. Rahman",
    date: formatDateTime(item.raw?.start_time || item.raw?.start_datetime || item.raw?.scheduled_at || item.raw?.created_at),
    time: item.timeKey,
    type: item.kind === "slot" ? shortId(item.raw?.service_id) : item.raw?.visit_status || "Appointment",
    status: item.status,
  }));
}

function appointmentTone(item) {
  const status = String(item.status || item.visit_status || "PENDING").toUpperCase();
  if (status === "COMPLETED") return "bg-emerald-200 text-emerald-950 border-emerald-200";
  if (status === "CONFIRMED") return "bg-sky-200 text-sky-950 border-sky-200";
  if (["PENDING", "REQUESTED", "CHECKED_IN", "IN_PROGRESS"].includes(status)) return "bg-amber-200 text-amber-950 border-amber-200";
  if (["CANCELLED", "FAILED"].includes(status)) return "bg-rose-200 text-rose-950 border-rose-200";
  return "bg-violet-200 text-violet-950 border-violet-200";
}

function slotTone(item) {
  const status = String(item.status || "AVAILABLE").toUpperCase();
  if (status === "AVAILABLE") return "bg-sky-200 text-sky-950 border-sky-200";
  if (status === "RESERVED") return "bg-violet-200 text-violet-950 border-violet-200";
  if (["BLOCKED", "UNAVAILABLE"].includes(status)) return "bg-rose-200 text-rose-950 border-rose-200";
  return "bg-amber-200 text-amber-950 border-amber-200";
}

function fallbackTab(role) {
  if (role === "patient") return "Appointments";
  if (role === "provider") return "Schedule";
  if (role === "front_desk") return "Desk";
  return "Catalog";
}

function tableColumns(role) {
  if (role === "patient") return ["Service", "Doctor", "Date", "Time", "Type", "Status", "Action"];
  if (role === "provider") return ["Patient name", "Doctor", "Date", "Time", "Type", "Status", "Action"];
  if (role === "front_desk") return ["Patient name", "Desk", "Date", "Time", "Type", "Status", "Action"];
  return ["Patient name", "Doctor", "Date", "Time", "Type", "Status", "Action"];
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function timeKey(date) {
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

function timeLabel(value) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = ((hours + 11) % 12) + 1;
  return `${displayHours} ${suffix}`;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function IconButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[10px] font-semibold tracking-tight text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SearchField({ value, onChange }) {
  return (
    <label className="hidden items-center gap-2 rounded-[11px] border border-slate-200 bg-white px-3 py-2 text-slate-400 shadow-sm sm:inline-flex">
      <Search size={14} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search records"
        className="w-[140px] border-none bg-transparent text-[11px] outline-none placeholder:text-slate-400"
      />
    </label>
  );
}

function Gauge({ completed, inProgress, waiting }) {
  const total = Math.max(completed + inProgress + waiting, 1);
  const completedPct = Math.max((completed / total) * 100, 2);
  const progressPct = Math.max(((completed + inProgress) / total) * 100, completedPct + 2);

  return (
    <svg viewBox="0 0 180 110" className="w-full max-w-[190px]">
      <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="#dbe7ef" strokeWidth="16" strokeLinecap="round" />
      <path
        d="M20 90 A70 70 0 0 1 160 90"
        fill="none"
        stroke="#0f5fe0"
        strokeWidth="16"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${progressPct} 100`}
        opacity="0.9"
      />
      <path
        d="M20 90 A70 70 0 0 1 160 90"
        fill="none"
        stroke="#2f80ed"
        strokeWidth="16"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${completedPct} 100`}
      />
      <text x="90" y="74" textAnchor="middle" className="fill-slate-950 text-[18px] font-semibold">
        {completed}
      </text>
      <text x="90" y="92" textAnchor="middle" className="fill-slate-500 text-[10px]">
        completed
      </text>
    </svg>
  );
}

function LegendRow({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between rounded-[13px] bg-slate-50 px-3 py-1.5 text-[11px]">
      <span className="inline-flex items-center gap-2 text-slate-600">
        <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
        {label}
      </span>
      <span className="font-medium text-slate-950">{value}</span>
    </div>
  );
}

function Avatar({ value }) {
  const text = String(value || "?").slice(0, 1).toUpperCase();
  return <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">{text}</div>;
}
