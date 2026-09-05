import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronDown, ClipboardList, Clock3, Pencil, Plus, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { ActionButton, EmptyState, PageFrame, Panel, Row, StatusPill } from "../components/ui";
import { formatDateTime, makeId, statusTone } from "../lib/workspace";

// Sort newest-first by whichever timestamp the record has.
function byRecency(a, b) {
  const at = new Date(a.updated_at || a.created_at || 0).getTime();
  const bt = new Date(b.updated_at || b.created_at || 0).getTime();
  return bt - at;
}

function safeCollection(value) {
  return Array.isArray(value) ? value : [];
}

function joinLabelParts(...parts) {
  return parts
    .flat()
    .map((part) => (typeof part === "string" ? part.trim() : part))
    .filter((part) => typeof part === "string" && part.length > 0)
    .join(" ");
}

function pickLabel(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function displayPerson(person, fallbackLabel) {
  if (!person) return fallbackLabel;
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return pickLabel(
    fullName,
    person.name,
    person.display_name,
    person.full_name,
    person.provider_name,
    fallbackLabel
  );
}

function displayService(service, fallbackLabel) {
  if (!service) return fallbackLabel;
  return pickLabel(
    service.name,
    service.title,
    service.service_name,
    service.display_name,
    service.label,
    fallbackLabel
  );
}

function slotSummary(slot, serviceById, providerById) {
  if (!slot) {
    return {
      title: "Open availability",
      detail: "No slot metadata is available.",
      badge: "Available",
    };
  }

  const service = slot.service || serviceById.get(String(slot.service_id)) || null;
  const provider = slot.provider || providerById.get(String(slot.provider_id)) || null;
  const serviceLabel = displayService(service, slot?.service_name || "Available appointment");
  const providerLabel = displayPerson(provider, slot?.provider_name || "Assigned provider");
  const specialty = pickLabel(slot?.specialty, service?.specialty, service?.description, provider?.specialty);
  const location = joinLabelParts(slot?.location, slot?.room, slot?.clinic, slot?.department_name);

  return {
    title: formatDateTime(slot.start_datetime),
    detail: [serviceLabel, providerLabel, specialty, location].filter(Boolean).join(" · ") || "Open availability",
    badge: [serviceLabel, providerLabel].filter(Boolean).join(" · ") || "Available",
  };
}

function appointmentSummary(appointment, slotById, serviceById, providerById) {
  const slot = slotById.get(String(appointment?.slot_id));
  const service = slot?.service || (slot ? serviceById.get(String(slot.service_id)) : null);
  const provider = slot?.provider || (slot ? providerById.get(String(slot.provider_id)) : null);
  const serviceLabel = displayService(service, appointment?.service_name || "Booked visit");
  const providerLabel = displayPerson(provider, appointment?.provider_name || "Care team member");
  const location = joinLabelParts(slot?.location, slot?.room, slot?.clinic);

  return {
    serviceLabel,
    providerLabel,
    slotLabel: slot ? formatDateTime(slot.start_datetime) : formatDateTime(appointment?.start_time || appointment?.created_at),
    detail: [service?.specialty || service?.description, providerLabel, location].filter(Boolean).join(" · ") || "Appointment details unavailable",
  };
}

function buildBookingKey(scope) {
  return makeId(scope);
}

export function PatientView({ active, data, onAction, load, onNavigate, onLogout }) {
  if (active === "Profile") {
    return <PatientProfile data={data} onAction={onAction} load={load} onLogout={onLogout} />;
  }

  if (active === "History") {
    return <PatientHistory data={data} />;
  }

  return <PatientAppointments data={data} onAction={onAction} load={load} />;
}

function PatientAppointments({ data, onAction, load }) {
  const services = safeCollection(data?.services);
  const slots = safeCollection(data?.slots);
  const appointments = safeCollection(data?.appointments);
  const providers = safeCollection(data?.providers);

  const serviceById = useMemo(() => new Map(services.map((service) => [String(service.id), service])), [services]);
  const providerById = useMemo(() => new Map(providers.map((provider) => [String(provider.id), provider])), [providers]);
  const slotById = useMemo(() => new Map(slots.map((slot) => [String(slot.id), slot])), [slots]);

  const [serviceId, setServiceId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [slotMenuOpen, setSlotMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingNotice, setBookingNotice] = useState("");
  const [waitlistSlotId, setWaitlistSlotId] = useState("");
  const [rescheduleDialog, setRescheduleDialog] = useState(null);

  const availableSlots = useMemo(() => {
    return slots
      .filter((slot) => String(slot.status || "").toUpperCase() === "AVAILABLE")
      .filter((slot) => (serviceId ? String(slot.service_id) === serviceId : true))
      .sort((left, right) => new Date(left.start_datetime || 0) - new Date(right.start_datetime || 0));
  }, [serviceId, slots]);

  const activeAppointments = useMemo(() => {
    return appointments
      .filter((item) => !["CANCELLED", "COMPLETED"].includes(String(item?.status || "").toUpperCase()))
      .sort(byRecency);
  }, [appointments]);

  const historyAppointments = useMemo(() => {
    return appointments
      .filter((item) => ["CANCELLED", "COMPLETED"].includes(String(item?.status || "").toUpperCase()))
      .sort(byRecency);
  }, [appointments]);

  const confirmedAppointments = useMemo(() => {
    return appointments.filter((item) => String(item?.status || "").toUpperCase() === "CONFIRMED").length;
  }, [appointments]);

  const selectedService = serviceById.get(String(serviceId)) || null;
  const selectedSlot = availableSlots.find((slot) => String(slot.id) === slotId) || null;

  const rescheduleAppointment = rescheduleDialog
    ? appointments.find((item) => String(item.id) === String(rescheduleDialog.appointmentId)) || null
    : null;
  const rescheduleSlot = rescheduleAppointment ? slotById.get(String(rescheduleAppointment.slot_id)) || null : null;
  const rescheduleServiceId = rescheduleSlot?.service_id || rescheduleAppointment?.service_id || "";
  const rescheduleSlots = rescheduleAppointment
    ? slots
        .filter((slot) => String(slot.status || "").toUpperCase() === "AVAILABLE")
        .filter((slot) => (rescheduleServiceId ? String(slot.service_id) === String(rescheduleServiceId) : true))
        .sort((left, right) => new Date(left.start_datetime || 0) - new Date(right.start_datetime || 0))
    : [];
  const selectedRescheduleSlot = rescheduleSlots.find((slot) => String(slot.id) === String(rescheduleDialog?.slotId)) || rescheduleSlots[0] || null;

  const resetSelection = () => {
    setServiceId("");
    setSlotId("");
    setServiceMenuOpen(false);
    setSlotMenuOpen(false);
  };

  const closeMenus = () => {
    setServiceMenuOpen(false);
    setSlotMenuOpen(false);
  };

  const toggleServiceMenu = () => {
    setSlotMenuOpen(false);
    setServiceMenuOpen((current) => !current);
  };

  const toggleSlotMenu = () => {
    setServiceMenuOpen(false);
    setSlotMenuOpen((current) => !current);
  };

  const openRescheduleDialog = (appointment) => {
    const slot = slotById.get(String(appointment.slot_id));
    const serviceIdForAppointment = slot?.service_id || appointment.service_id || "";
    const compatibleSlots = slots
      .filter((candidate) => String(candidate.status || "").toUpperCase() === "AVAILABLE")
      .filter((candidate) => (serviceIdForAppointment ? String(candidate.service_id) === String(serviceIdForAppointment) : true))
      .sort((left, right) => new Date(left.start_datetime || 0) - new Date(right.start_datetime || 0));

    setRescheduleDialog({
      appointmentId: appointment.id,
      slotId: compatibleSlots[0] ? String(compatibleSlots[0].id) : "",
    });
  };

  const book = async (event) => {
    event?.preventDefault();
    if (!slotId) return;
    setBookingBusy(true);
    setBookingNotice("");
    try {
      const appointment = await onAction({
        scope: "patient.book",
        label: "Book appointment",
        path: "/appointments",
        method: "POST",
        body: { slot_id: Number(slotId) },
        headers: { "Idempotency-Key": buildBookingKey("book") },
        successMessage: "Booking submitted",
      });
      resetSelection();
      setBookingNotice(`Booking ${appointment?.status || "PENDING"}. Your appointment list is refreshing.`);
      void load().catch((error) => setBookingNotice(error.message));
    } catch (error) {
      setBookingNotice(error.message);
      if (error.status === 409 || /taken|reserved|conflict|already/i.test(error.message || "")) {
        setWaitlistSlotId(slotId);
      }
    } finally {
      setBookingBusy(false);
    }
  };

  const joinWaitlist = async (id) => {
    setBookingBusy(true);
    setBookingNotice("");
    try {
      await onAction({
        scope: "patient.waitlist",
        label: "Join waitlist",
        path: `/appointments/waitlist/${id}`,
        method: "POST",
        body: {},
        successMessage: "Added to waitlist",
      });
      setWaitlistSlotId("");
      await load();
    } catch (error) {
      setBookingNotice(error.message);
    } finally {
      setBookingBusy(false);
    }
  };

  const runBilling = async (id) => {
    setBookingBusy(true);
    setBookingNotice("");
    try {
      const result = await onAction({
        scope: "patient.billing",
        label: "Billing pre-check",
        path: `/appointments/${id}/billing/pre-check`,
        method: "POST",
        body: {},
        successMessage: "Billing pre-check complete",
      });
      setBookingNotice(`Billing ${result?.status || "checked"} · ${result?.amount != null ? `$${result.amount}` : "amount pending"}`);
      await load();
    } catch (error) {
      setBookingNotice(error.message);
    } finally {
      setBookingBusy(false);
    }
  };

  const cancel = async (id) => {
    setBookingBusy(true);
    try {
      await onAction({
        scope: "patient.cancel",
        label: "Cancel appointment",
        path: `/appointments/${id}/cancel`,
        method: "POST",
        body: {},
        headers: { "Idempotency-Key": buildBookingKey("cancel") },
        successMessage: "Appointment cancelled",
      });
      resetSelection();
      await load();
    } finally {
      setBookingBusy(false);
    }
  };

  const runSearch = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    setBookingBusy(true);
    try {
      const response = await onAction({
        scope: "patient.search",
        label: "Search services",
        path: "/search",
        method: "POST",
        body: { query: query.trim(), limit: 6 },
      });
      setSearchResults(response?.results || []);
      setSearchMessage(response?.message || "");
      const first = response?.results?.[0];
      if (first?.service_id) {
        setServiceId(String(first.service_id));
        setSlotId("");
      }
    } catch (error) {
      setSearchMessage(error.message);
    } finally {
      setBookingBusy(false);
    }
  };

  const confirmReschedule = async () => {
    if (!rescheduleAppointment || !selectedRescheduleSlot) return;
    setBookingBusy(true);
    try {
      await onAction({
        scope: "patient.reschedule",
        label: "Reschedule appointment",
        path: `/appointments/${rescheduleAppointment.id}/reschedule`,
        method: "POST",
        body: { slot_id: Number(selectedRescheduleSlot.id) },
        headers: { "Idempotency-Key": buildBookingKey("reschedule") },
        successMessage: "Appointment rescheduled",
      });
      setRescheduleDialog(null);
      await load();
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-full flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f766e]">Care</p>
              <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-slate-950">Appointments</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live · {new Date().toLocaleDateString([], { month: "short", day: "2-digit" })}
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <section className="min-h-0 self-start rounded-2xl border border-slate-200 px-4 py-4">
              <SectionHeader
                title="Create a visit"
                detail="Choose a service, then pick an open slot from the available list."
              />

              <form className="mt-3 flex min-h-0 flex-col" onSubmit={book}>
                <div className="space-y-3.5">
                  <DropdownField
                    label="Service"
                    count={`${services.length} options`}
                    open={serviceMenuOpen}
                    onToggle={toggleServiceMenu}
                    onClose={() => setServiceMenuOpen(false)}
                    triggerLabel={
                      selectedService ? (
                        <div className="min-w-0" title={displayService(selectedService, "Selected service")}>
                          <p className="truncate text-[13px] font-medium text-slate-950">{displayService(selectedService, "Selected service")}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500" title={selectedService.specialty || selectedService.description || "Healthcare service"}>
                            {selectedService.specialty || selectedService.description || "Healthcare service"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">Choose service</span>
                      )
                    }
                    placeholder="Choose service"
                  >
                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                      {services.map((service) => {
                        const selected = serviceId === String(service.id);
                        return (
                          <DropdownOption
                            key={service.id}
                            selected={selected}
                            onSelect={() => {
                              setServiceId(String(service.id));
                              setSlotId("");
                              closeMenus();
                            }}
                            title={displayService(service, "Healthcare service")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium text-slate-950">{displayService(service, "Healthcare service")}</p>
                                <p className="mt-0.5 truncate text-[11px] text-slate-500">{service.specialty || service.description || "Healthcare service"}</p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                  selected
                                    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                                    : "border-slate-200 bg-slate-100 text-slate-600"
                                }`}
                              >
                                {selected ? "Selected" : "Select"}
                              </span>
                            </div>
                          </DropdownOption>
                        );
                      })}
                    </div>
                  </DropdownField>

                  <DropdownField
                    label="Slot"
                    count={`${availableSlots.length} open`}
                    open={slotMenuOpen}
                    onToggle={toggleSlotMenu}
                    onClose={() => setSlotMenuOpen(false)}
                    triggerLabel={
                      selectedSlot ? (
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-950">{formatDateTime(selectedSlot.start_datetime)}</p>
                          <p className="mt-0.5 truncate text-[10px] text-slate-500">{slotSummary(selectedSlot, serviceById, providerById).detail}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">Choose available slot</span>
                      )
                    }
                    placeholder="Choose available slot"
                    disabled={!availableSlots.length}
                    disabledHint={!serviceId ? "Pick a service to see its open slots." : "No open slots for this service right now."}
                  >
                    <div className="grid gap-1.5">
                      {availableSlots.map((slot) => {
                        const selected = slotId === String(slot.id);
                        const meta = slotSummary(slot, serviceById, providerById);
                        return (
                          <DropdownOption
                            key={slot.id}
                            selected={selected}
                            onSelect={() => {
                              setSlotId(String(slot.id));
                              setSlotMenuOpen(false);
                            }}
                            title={meta.title}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium text-slate-950">{meta.title}</p>
                                <p className="mt-0.5 truncate text-[11px] text-slate-500">{meta.detail}</p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                  selected
                                    ? "border-sky-200 bg-sky-100 text-sky-800"
                                    : "border-slate-200 bg-slate-100 text-slate-600"
                                }`}
                              >
                                {selected ? "Selected" : "Select"}
                              </span>
                            </div>
                          </DropdownOption>
                        );
                      })}
                    </div>
                  </DropdownField>
                  {!availableSlots.length ? (
                    <p className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                      {serviceId ? "No available slots for the selected service." : "Pick a service above, or browse all open slots below."}
                    </p>
                  ) : null}
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={!slotId || bookingBusy}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0f766e] px-4 text-[13px] font-semibold text-white transition hover:bg-[#0b665f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={18} />
                    Book visit
                  </button>
                  {waitlistSlotId ? (
                    <button
                      type="button"
                      disabled={bookingBusy}
                      onClick={() => joinWaitlist(waitlistSlotId)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 text-[12px] font-semibold text-amber-800"
                    >
                      Join waitlist
                    </button>
                  ) : null}
                </div>
                {bookingNotice ? (
                  <p
                    role="status"
                    aria-live="polite"
                    className="mt-3 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800"
                  >
                    {bookingNotice}
                  </p>
                ) : null}
              </form>

              {serviceId && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <SectionHeader
                    title="Available times"
                    meta={`${availableSlots.length} open`}
                    metaTone={availableSlots.length ? "success" : "neutral"}
                  />
                  <div className="mt-3 rounded-[18px] border border-slate-200 bg-white">
                    <div className="divide-y divide-slate-200">
                      {availableSlots.map((slot) => {
                        const meta = slotSummary(slot, serviceById, providerById);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSlotId(String(slot.id))}
                            className={`flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition ${
                              slotId === String(slot.id) ? "bg-slate-50" : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium text-slate-950">{meta.title}</p>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">{meta.detail}</p>
                            </div>
                            <StatusPill value="available" tone="success" />
                          </button>
                        );
                      })}
                      {!availableSlots.length && (
                        <div className="px-4 py-6">
                          <EmptyState icon={Clock3} title="No slots available" detail="Open times will appear here." />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="min-h-0 self-start rounded-2xl border border-slate-200 px-4 py-4">
              <SectionHeader
                title="Current appointments"
                meta={`${confirmedAppointments} confirmed`}
                metaTone={confirmedAppointments ? "success" : "neutral"}
                detail={
                  activeAppointments.length
                    ? `${activeAppointments.length} active appointment${activeAppointments.length === 1 ? "" : "s"}`
                    : "Bookings that are still active or in progress will appear here."
                }
              />

              <div className="mt-3 rounded-[18px] border border-slate-200 bg-white">
                <div className="divide-y divide-slate-200">
                  {(activeAppointments.length ? activeAppointments : [null]).map((appointment) =>
                    appointment ? (
                      <div key={appointment.id} className="px-4 py-3.5">
                        {(() => {
                          const summary = appointmentSummary(appointment, slotById, serviceById, providerById);
                          return (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[12px] text-slate-500">APT-{String(appointment.id).padStart(3, "0")}</p>
                                  <p className="mt-0.5 truncate text-[14px] font-medium text-slate-950">{summary.serviceLabel}</p>
                                  <p className="mt-0.5 truncate text-[12px] text-slate-500">{summary.detail}</p>
                                </div>
                                <StatusPill value={String(appointment.status || "").toLowerCase()} tone={statusTone(appointment.status)} />
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openRescheduleDialog(appointment)}
                                  disabled={bookingBusy}
                                  className="inline-flex h-9 items-center justify-center rounded-[10px] border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                  Reschedule
                                </button>
                                <button
                                  type="button"
                                  onClick={() => runBilling(appointment.id)}
                                  disabled={bookingBusy}
                                  className="inline-flex h-9 items-center justify-center rounded-[10px] border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                  Billing check
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancel(appointment.id)}
                                  disabled={bookingBusy}
                                  className="inline-flex h-9 items-center justify-center rounded-[10px] border border-rose-300 bg-white px-3.5 text-[13px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div key="empty-current" className="px-4 py-5">
                        <EmptyState
                          icon={ClipboardList}
                          title="No active appointments"
                          detail="Bookings will appear here once they are confirmed."
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

      {rescheduleDialog ? (
        <RescheduleModal
          appointment={rescheduleAppointment}
          slots={rescheduleSlots}
          selectedSlot={selectedRescheduleSlot}
          slotById={slotById}
          providerById={providerById}
          serviceById={serviceById}
          busy={bookingBusy}
          onClose={() => setRescheduleDialog(null)}
          onSelectSlot={(slotIdValue) => setRescheduleDialog((current) => ({ ...current, slotId: slotIdValue }))}
          onConfirm={confirmReschedule}
        />
      ) : null}
    </div>
  );
}

function PatientFindCare({ data, onAction, onNavigate }) {
  const services = safeCollection(data?.services);
  const departments = safeCollection(data?.departments);
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      if (departmentId && String(service.department_id) !== String(departmentId)) return false;
      if (!query.trim()) return true;
      return `${service.name} ${service.specialty || ""} ${service.description || ""}`.toLowerCase().includes(query.trim().toLowerCase());
    });
  }, [departmentId, query, services]);

  const runSearch = async (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setMessage("Enter a symptom, specialty, or service name.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await onAction({
        scope: "patient.search",
        label: "Search services",
        path: "/search",
        method: "POST",
        body: { query: query.trim(), limit: 8 },
      });
      setResults(response?.results || []);
      setMessage(response?.message || (response?.results?.length ? `${response.results.length} matching services.` : "No matching published services."));
    } catch (error) {
      setResults([]);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
      <section className="rounded-lg border border-slate-200 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0f766e]">Find care</p>
        <h2 className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em] text-slate-950">Discover the right service</h2>
        <form onSubmit={runSearch} className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by need, specialty, or service" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100" />
          </label>
          <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px]">
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
          <ActionButton type="submit" disabled={busy}>{busy ? "Searching..." : "Semantic search"}</ActionButton>
        </form>
        {message ? <p className="mt-3 text-[12px] text-slate-500">{message}</p> : null}
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel eyebrow="Semantic matches" title="Published catalog results">
          <div className="space-y-2">
            {results.map((result) => (
              <button key={`${result.service_id}-${result.score}`} type="button" onClick={() => onNavigate?.("Appointments")} className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-950">{result.service_name}</p>
                <p className="mt-1 text-xs text-slate-500">{result.department}{result.specialty ? ` · ${result.specialty}` : ""}</p>
                <p className="mt-2 text-[12px] leading-5 text-slate-600">{result.content}</p>
              </button>
            ))}
            {!results.length ? <EmptyState icon={Search} title="No semantic matches yet" detail="Run a search to see published services related to your question." /> : null}
          </div>
        </Panel>
        <Panel eyebrow="Browse" title={`${filteredServices.length} services`}>
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {filteredServices.map((service) => (
              <div key={service.id} className="rounded-[16px] border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{displayService(service, "Service")}</p>
                    <p className="mt-1 text-xs text-slate-500">{service.specialty || service.description || "General care"}</p>
                  </div>
                  <ActionButton type="button" tone="secondary" onClick={() => onNavigate?.("Appointments")}>Book</ActionButton>
                </div>
              </div>
            ))}
            {!filteredServices.length ? <EmptyState icon={ClipboardList} title="No catalog items" detail="Published services will appear here." /> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PatientHistory({ data }) {
  const appointments = safeCollection(data?.appointments);
  const services = safeCollection(data?.services);
  const slots = safeCollection(data?.slots);
  const providers = safeCollection(data?.providers);
  const serviceById = useMemo(() => new Map(services.map((service) => [String(service.id), service])), [services]);
  const providerById = useMemo(() => new Map(providers.map((provider) => [String(provider.id), provider])), [providers]);
  const slotById = useMemo(() => new Map(slots.map((slot) => [String(slot.id), slot])), [slots]);

  const historyAppointments = appointments
    .filter((item) => ["CANCELLED", "COMPLETED"].includes(String(item?.status || "").toUpperCase()))
    .sort(byRecency);
  const completed = historyAppointments.filter((item) => String(item.status || "").toUpperCase() === "COMPLETED").length;
  const cancelled = historyAppointments.filter((item) => String(item.status || "").toUpperCase() === "CANCELLED").length;

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-full flex-col gap-4 p-4 sm:p-5">
        <section className="rounded-2xl border border-slate-200 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f766e]">History</p>
          <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-slate-950">Past visits</h2>
          <p className="mt-1 text-[13px] text-slate-500">Completed and cancelled appointments in one place.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Total" value={historyAppointments.length} detail="Resolved visits" />
            <Metric label="Completed" value={completed} detail="Finished successfully" />
            <Metric label="Cancelled" value={cancelled} detail="Cancelled before visit" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 px-4 py-4">
          <SectionHeader title="Visit record" detail="Your resolved booking history." />
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white">
            <div className="divide-y divide-slate-100">
              {historyAppointments.map((appointment) => {
                const summary = appointmentSummary(appointment, slotById, serviceById, providerById);
                return (
                  <div key={appointment.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-slate-950">{summary.serviceLabel}</p>
                      <p className="mt-0.5 truncate text-[13px] text-slate-500">{summary.slotLabel}</p>
                      <p className="mt-0.5 truncate text-[12px] text-slate-400">{summary.detail}</p>
                    </div>
                    <StatusPill value={appointment.status} tone={statusTone(appointment.status)} />
                  </div>
                );
              })}
              {!historyAppointments.length ? (
                <div className="px-4 py-6">
                  <EmptyState
                    icon={CalendarDays}
                    title="No history yet"
                    detail="Completed and cancelled visits will appear here."
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PatientProfile({ data, onAction, load, onLogout }) {
  const profile = data?.patientProfile || {};
  const appointments = safeCollection(data?.appointments);
  const [form, setForm] = useState({ first_name: profile.first_name || "", last_name: profile.last_name || "" });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setForm({ first_name: profile.first_name || "", last_name: profile.last_name || "" });
  }, [profile.first_name, profile.last_name]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const cancelEdit = () => {
    setForm({ first_name: profile.first_name || "", last_name: profile.last_name || "" });
    setEditing(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!profile.id) {
      setProfileError("Your patient profile is not available yet. Refresh and try again.");
      return;
    }
    setBusy(true);
    setProfileError("");
    try {
      await onAction({
        scope: "patient.profile.update",
        label: "Update profile",
        path: `/patients/${profile.id}`,
        method: "PATCH",
        body: form,
        successMessage: "Profile updated",
      });
      setEditing(false);
      await load();
    } catch (error) {
      setProfileError(error.message || "Profile could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  const deleteProfile = async () => {
    setBusy(true);
    try {
      await onAction({
        scope: "patient.profile.delete",
        label: "Delete profile",
        path: `/patients/${profile.id}`,
        method: "DELETE",
        successMessage: "Profile deleted",
      });
      onLogout?.();
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  };

  const activeCount = appointments.filter((item) => !["CANCELLED", "COMPLETED"].includes(String(item?.status || "").toUpperCase())).length;
  const resolvedCount = appointments.filter((item) => ["CANCELLED", "COMPLETED"].includes(String(item?.status || "").toUpperCase())).length;
  const sortedAppointments = [...appointments].sort(byRecency);

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-h-full flex-col gap-4">
        <section className="rounded-2xl bg-[#0f766e] px-4 py-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><UserRound size={18} /></div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">Patient profile</p>
                <h2 className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em]">{form.first_name || form.last_name ? `${form.first_name} ${form.last_name}`.trim() : "Complete your profile"}</h2>
              </div>
            </div>
            <StatusPill value="Active record" tone="success" />
          </div>
        </section>

        <section className="grid min-h-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel eyebrow="Identity" title="Personal details" description="Only your name can be changed from this workspace." className="min-h-0">
            <form onSubmit={saveProfile}>
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileField label="First name" name="first_name" value={form.first_name} onChange={updateField} disabled={!editing} />
                <ProfileField label="Last name" name="last_name" value={form.last_name} onChange={updateField} disabled={!editing} />
              </div>
              <div className="mt-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Email address</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{profile.email || "n/a"}</p>
                <p className="mt-1 text-xs text-slate-500">Email is managed by your sign-in account.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {editing ? (
                  <>
                    <ActionButton type="submit" disabled={busy}><Save size={15} /> Save changes</ActionButton>
                    <ActionButton tone="secondary" onClick={cancelEdit} disabled={busy}><X size={15} /> Cancel</ActionButton>
                  </>
                ) : (
                  <ActionButton onClick={() => setEditing(true)}><Pencil size={15} /> Edit profile</ActionButton>
                )}
              </div>
              {profileError ? <p role="alert" className="mt-3 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{profileError}</p> : null}
            </form>
          </Panel>

          <Panel eyebrow="Snapshot" title="Appointment footprint" className="min-h-0">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Row label="Active appointments" value={activeCount} />
              <Row label="Resolved visits" value={resolvedCount} />
              <Row label="Total appointments" value={appointments.length} />
              <Row label="Latest status" value={sortedAppointments[0]?.status || "n/a"} />
            </div>
          </Panel>
        </section>

        <section className="rounded-lg border border-rose-200 bg-white px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-600">Account controls</p>
              <h3 className="mt-1 text-[16px] font-semibold text-slate-950">Delete patient profile</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">This permanently removes your patient record and cannot be reversed.</p>
            </div>
            {!confirmingDelete ? (
              <ActionButton tone="danger" onClick={() => setConfirmingDelete(true)} disabled={busy || !profile.id}>
                <Trash2 size={15} /> Delete profile
              </ActionButton>
            ) : null}
          </div>
          {confirmingDelete ? (
            <div className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-[13px] font-medium text-rose-800">
                Are you sure? This deletes your patient record and all associated history — this cannot be undone.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton tone="danger" onClick={deleteProfile} disabled={busy}>
                  <Trash2 size={15} /> Yes, permanently delete
                </ActionButton>
                <ActionButton tone="secondary" onClick={() => setConfirmingDelete(false)} disabled={busy}>
                  <X size={15} /> Cancel
                </ActionButton>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ProfileField({ label, name, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function SectionHeader({ eyebrow, title, detail, meta, metaTone = "success", footerAction }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f766e]">{eyebrow}</p> : null}
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h3>
        {detail ? <p className="mt-1 text-[13px] leading-5 text-slate-500">{detail}</p> : null}
      </div>
      {meta ? (
        <StatusPill value={meta} tone={metaTone} />
      ) : footerAction ? (
        <div className="pt-1">{footerAction}</div>
      ) : null}
    </div>
  );
}

// Renders its trigger inline, but the open option list is portaled to document.body and
// positioned with `position: fixed` from the trigger's live bounding rect. This is required
// so the list is never visually clipped by an ancestor's `overflow-y-auto`/`overflow-hidden`
// (e.g. the scrollable page wrapper) and always renders above sibling content regardless of
// scroll position.
function DropdownField({ label, count, open, onToggle, onClose, triggerLabel, placeholder, disabled = false, disabledHint, children }) {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listboxId = useRef(makeId("listbox"));
  const [coords, setCoords] = useState(null);

  const updateCoords = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const preferredHeight = 260;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < preferredHeight && spaceAbove > spaceBelow;

    setCoords({
      left: rect.left,
      width: rect.width,
      top: openUpward ? undefined : rect.bottom + 8,
      bottom: openUpward ? viewportHeight - rect.top + 8 : undefined,
      maxHeight: Math.max(160, (openUpward ? spaceAbove : spaceBelow) - 16),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }

    updateCoords();

    const handlePointer = (event) => {
      const clickedTrigger = containerRef.current && containerRef.current.contains(event.target);
      const clickedPanel = panelRef.current && panelRef.current.contains(event.target);
      if (!clickedTrigger && !clickedPanel) onClose?.();
    };
    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    const handleReposition = () => updateCoords();

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, onClose]);

  return (
    <div className="block" ref={containerRef}>
      <span className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span>{label}</span>
        {count ? <span>{count}</span> : <span>&nbsp;</span>}
      </span>
      <div className="relative" ref={triggerRef}>
        <button
          type="button"
          onClick={() => {
            if (!disabled) onToggle?.();
          }}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId.current}
          className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left outline-none transition hover:border-slate-300 focus:border-[#2f7be5] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          <div className="min-w-0 flex-1">{triggerLabel || <span className="text-slate-400">{placeholder}</span>}</div>
          <ChevronDown size={16} className={`ml-3 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && !disabled && coords
          ? createPortal(
              <div
                ref={panelRef}
                id={listboxId.current}
                role="listbox"
                aria-label={label}
                style={{
                  position: "fixed",
                  left: coords.left,
                  width: coords.width,
                  top: coords.top,
                  bottom: coords.bottom,
                  maxHeight: coords.maxHeight,
                }}
                className="z-[100] overflow-hidden rounded-[16px] border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
              >
                <div className="max-h-full overflow-y-auto [overscroll-behavior:contain]">{children}</div>
              </div>,
              document.body
            )
          : null}
      </div>
      {disabled && disabledHint ? <p className="mt-1.5 text-[11px] text-slate-400">{disabledHint}</p> : null}
    </div>
  );
}

function DropdownOption({ selected, onSelect, title, children }) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.();
    }
  };

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      title={title}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`h-[52px] cursor-pointer overflow-hidden rounded-[12px] border px-3 py-2.5 text-left outline-none transition focus:border-sky-200 focus:ring-2 focus:ring-sky-200 ${
        selected ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      {children}
    </div>
  );
}

function RescheduleModal({ appointment, slots, selectedSlot, slotById, providerById, serviceById, busy, onClose, onSelectSlot, onConfirm }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Lock background scroll, trap focus inside the dialog, and restore focus on close —
  // none of which the original modal did.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  const summary = appointment ? appointmentSummary(appointment, slotById, serviceById, providerById) : null;
  const noSlots = !slots.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="flex h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-modal-title"
          className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0f766e]">Reschedule appointment</p>
              <h3 id="reschedule-modal-title" className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em] text-slate-950">Choose a compatible slot</h3>
              <p className="mt-1 text-sm text-slate-500">
                Confirming this change will move the appointment to a new open time for the same service.
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-[12px] border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              Close
            </button>
          </div>

          <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
            <section className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
              {summary ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0f766e]">Current appointment</p>
                  <h4 className="mt-2 text-[18px] font-semibold text-slate-950">APT-{String(appointment.id).padStart(3, "0")}</h4>
                  <p className="mt-1 text-sm text-slate-600">{summary.serviceLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">{summary.detail}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Row label="Current slot" value={summary.slotLabel} />
                    <Row label="Provider" value={summary.providerLabel} />
                  </div>
                </>
              ) : null}
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0f766e]">Compatible slots</p>
                  <h4 className="mt-1 text-[18px] font-semibold text-slate-950">{slots.length} open options</h4>
                </div>
                {selectedSlot ? <StatusPill value="Selected" tone="success" /> : null}
              </div>

              <div className="mt-4 max-h-[320px] overflow-y-auto rounded-[18px] border border-slate-200 bg-white [overscroll-behavior:contain]">
                <div className="divide-y divide-slate-200">
                  {slots.map((slot) => {
                    const meta = slotSummary(slot, serviceById, providerById);
                    const selected = selectedSlot && String(selectedSlot.id) === String(slot.id);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => onSelectSlot?.(String(slot.id))}
                        className={`flex min-h-[64px] w-full items-start justify-between gap-3 px-4 py-3 text-left transition ${
                          selected ? "bg-sky-50" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-950">{meta.title}</p>
                          <p className="mt-0.5 truncate text-[10px] text-slate-500">{meta.detail}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{meta.badge}</p>
                        </div>
                        <StatusPill value={selected ? "Selected" : "Available"} tone={selected ? "success" : "neutral"} />
                      </button>
                    );
                  })}
                  {noSlots ? (
                    <div className="px-4 py-8">
                      <EmptyState icon={Clock3} title="No compatible slots" detail="There are no open slots for this appointment's service yet." />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500">
                  Review the new time, then confirm the reschedule.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton type="button" tone="secondary" onClick={onClose} disabled={busy}>
                    Cancel
                  </ActionButton>
                  <ActionButton type="button" onClick={onConfirm} disabled={busy || !selectedSlot}>
                    {busy ? "Saving..." : "Confirm reschedule"}
                  </ActionButton>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-slate-950">{value}</p>
      <p className="mt-0.5 text-[12px] leading-4 text-slate-500">{detail}</p>
    </div>
  );
}