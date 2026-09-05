import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Search, UserPlus, Users } from "lucide-react";
import { ActionButton, EmptyState, InfoCard, StatusPill } from "../components/ui";
import { formatDateTime, statusTone } from "../lib/workspace";

export function FrontDeskView({ active, data, onAction, load }) {
  if (active === "Patients") return <PatientRoster data={data} onAction={onAction} load={load} />;
  if (active === "Operations") return <OperationsView data={data} onAction={onAction} load={load} />;
  return <DeskView data={data} onAction={onAction} load={load} />;
}

function DeskView({ data, onAction, load }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);
  const directoryError = data.patientDirectoryError;
  const appointments = data.appointments.filter((item) => !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(String(item.status).toUpperCase()));
  const waiting = appointments.filter((item) => String(item.visit_status || "NOT_STARTED").toUpperCase() === "NOT_STARTED");
  const checkedIn = appointments.filter((item) => String(item.visit_status).toUpperCase() === "CHECKED_IN");
  const filtered = appointments.filter((item) => {
    const patient = data.patients.find((record) => String(record.id) === String(item.patient_id));
    const patientName = patient ? `${patient.first_name || ""} ${patient.last_name || ""}` : "";
    return `${item.id} ${item.patient_id} ${item.status} ${item.visit_status} ${patientName} ${patient?.email || ""}`.toLowerCase().includes(search.trim().toLowerCase());
  });

  const registerPatient = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onAction({ scope: "frontdesk.register", label: "Register patient", path: "/auth/register", method: "POST", body: { ...form, role: "patient" }, successMessage: "Patient access created" });
      setForm({ first_name: "", last_name: "", email: "", password: "" });
      await load();
    } catch (caught) {
      setError(caught.message || "Patient registration failed.");
    } finally {
      setBusy(false);
    }
  };

  const run = async (path, label, body = {}) => {
    setBusy(true);
    setError("");
    try {
      const result = await onAction({ scope: "frontdesk.visit", label, path, method: path.includes("/generate/") || path.includes("/billing/") || path.includes("/cancel") || path.includes("/no-show") || path.includes("/check-in") ? "POST" : "GET", body, successMessage: label });
      if (result?.data) setDraft(result.data);
      await load();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FrontDeskShell
      eyebrow="Desk"
      title="Check-in workspace"
      detail="Register access, move patients through reception, and generate visit communications."
      icon={ClipboardList}
      refresh={load}
      stats={[
        { label: "Waiting", value: waiting.length },
        { label: "Checked in", value: checkedIn.length },
        { label: "Open visits", value: appointments.length },
        { label: "Patients", value: directoryError ? "-" : data.patients.length },
      ]}
    >
      <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)]">
        <section className="border-b border-slate-200 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3">
          <div className="flex items-start gap-2">
            <UserPlus size={16} className="mt-0.5 text-[#168479]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#168479]">New access</p>
              <h3 className="mt-0.5 text-[13px] font-semibold text-[#173b4a]">Register a patient</h3>
            </div>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-slate-500">Create sign-in access for patient booking.</p>
          <form onSubmit={registerPatient} className="mt-3 space-y-2.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" value={form.first_name} onChange={(value) => setForm((current) => ({ ...current, first_name: value }))} required={false} />
              <Field label="Last name" value={form.last_name} onChange={(value) => setForm((current) => ({ ...current, last_name: value }))} required={false} />
            </div>
            <Field label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} type="email" />
            <Field label="Temporary password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} type="password" />
            <ActionButton type="submit" disabled={busy || !form.email || !form.password} className="w-full">
              <UserPlus size={15} /> {busy ? "Creating access..." : "Create patient access"}
            </ActionButton>
            {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
          </form>
          {draft ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">Draft ready</p>
              <p className="mt-2 text-[14px] font-semibold text-slate-950">{draft.subject || draft.service_name || "Communication"}</p>
              <p className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[13px] leading-5 text-slate-600">{draft.body || draft.summary || "Generated content is ready to review."}</p>
            </div>
          ) : null}
        </section>
        <section className="flex min-h-0 flex-col">
          <div className="flex flex-col gap-3 border-b border-[#d9e7e2] pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#168479]">Queue</p>
              <h3 className="mt-0.5 text-[13px] font-semibold text-[#173b4a]">Booked visits</h3>
            </div>
            <label className="flex h-9 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 sm:w-auto">
              <Search size={13} className="text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient or appointment" className="w-full bg-transparent text-xs outline-none sm:w-40" />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.map((appointment) => {
              const visitStatus = String(appointment.visit_status || "NOT_STARTED").toUpperCase();
              const patient = data.patients.find((item) => String(item.id) === String(appointment.patient_id));
              const patientName = patient ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() : "";
              return (
                <div key={appointment.id} className="border-b border-slate-100 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{patientName || `Patient #${appointment.patient_id}`}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{patient?.email || `Appointment #${appointment.id}`} · {formatDateTime(appointment.start_time || appointment.scheduled_at || appointment.created_at)}</p>
                    </div>
                    <StatusPill value={visitStatus.replaceAll("_", " ")} tone={statusTone(visitStatus)} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {visitStatus === "NOT_STARTED" ? (
                      <ActionButton onClick={() => run(`/appointments/${appointment.id}/visit/check-in`, "Check in patient")} disabled={busy}>
                        <CheckCircle2 size={15} /> Check in
                      </ActionButton>
                    ) : null}
                    <ActionButton tone="secondary" onClick={() => run(`/appointments/${appointment.id}/billing/pre-check`, "Billing pre-check")} disabled={busy}>
                      Billing
                    </ActionButton>
                    <ActionButton tone="secondary" onClick={() => run(`/appointments/${appointment.id}/generate/summary`, "Generate summary", { include_instructions: true, include_cancellation_policy: true })} disabled={busy}>
                      Summary
                    </ActionButton>
                    <ActionButton tone="secondary" onClick={() => run(`/appointments/${appointment.id}/generate/followup`, "Generate follow-up", { tone: "professional", include_next_steps: true })} disabled={busy}>
                      Follow-up
                    </ActionButton>
                    <ActionButton tone="danger" onClick={() => {
                      const reason = window.prompt("Cancellation reason");
                      if (reason?.trim()) run(`/appointments/${appointment.id}/cancel`, "Cancel appointment", { reason: reason.trim() });
                    }} disabled={busy}>
                      Cancel
                    </ActionButton>
                    <ActionButton tone="danger" onClick={() => run(`/appointments/${appointment.id}/no-show`, "Mark no-show")} disabled={busy}>
                      No-show
                    </ActionButton>
                  </div>
                </div>
              );
            })}
            {!filtered.length ? (
              <div className="py-8">
                <EmptyState icon={CalendarDays} title="No visits in queue" detail="Booked appointments will appear here for reception." />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </FrontDeskShell>
  );
}

function PatientRoster({ data, onAction, load }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const patients = data.patients.filter((patient) => `${patient.id} ${patient.first_name || ""} ${patient.last_name || ""} ${patient.email || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = patients.find((patient) => String(patient.id) === String(selectedId)) || patients[0];
  const [form, setForm] = useState({ first_name: "", last_name: "" });

  useEffect(() => {
    setForm({ first_name: selected?.first_name || "", last_name: selected?.last_name || "" });
  }, [selected?.id, selected?.first_name, selected?.last_name]);

  const savePatient = async (event) => {
    event.preventDefault();
    if (!selected?.id) return;
    setBusy(true);
    setNotice("");
    try {
      await onAction({
        scope: "frontdesk.patient.update",
        label: "Update patient",
        path: `/patients/${selected.id}`,
        method: "PATCH",
        body: form,
        successMessage: "Patient record updated",
      });
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FrontDeskShell eyebrow="Patients" title="Patient directory" detail="Find and update patient access records at reception." icon={Users} refresh={load} stats={[{ label: "Total patients", value: data.patients.length }, { label: "Showing", value: patients.length }]}>
      <div className="flex min-h-0 flex-col lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-[#d9e7e2] pb-4 lg:border-b-0 lg:border-r lg:pr-5">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or ID" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <div className="mt-3 flex-1 overflow-y-auto">
            {patients.map((patient) => (
              <button key={patient.id} type="button" onClick={() => setSelectedId(String(patient.id))} className={`flex flex-col gap-2 border-b border-slate-100 px-2 py-3 text-left sm:flex-row sm:items-center sm:justify-between ${String(selected?.id) === String(patient.id) ? "bg-[#e7f5f2]" : "hover:bg-slate-50"}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{`${patient.first_name || ""} ${patient.last_name || ""}`.trim() || `Patient #${patient.id}`}</p>
                  <p className="truncate text-xs text-slate-500">{patient.email || "No email"}</p>
                </div>
                <span className="text-xs text-slate-500">#{patient.id}</span>
              </button>
            ))}
            {!patients.length ? <EmptyState icon={Users} title="No patients found" detail="Register patient access from the Desk tab." /> : null}
          </div>
        </section>
        <aside className="w-full shrink-0 pt-4 lg:w-[320px] lg:pl-5 lg:pt-0">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-[#d9e7e2] pb-4">
                <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#e7f5f2] text-[#0f766e]"><Users size={19} /></div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#168479]">Selected record</p>
                  <h3 className="mt-1 text-[16px] font-semibold text-[#173b4a]">{`${selected.first_name || ""} ${selected.last_name || ""}`.trim() || "Selected patient"}</h3>
                </div>
              </div>
              <form onSubmit={savePatient} className="space-y-3 py-4">
                <Field label="First name" value={form.first_name} onChange={(value) => setForm((current) => ({ ...current, first_name: value }))} required={false} />
                <Field label="Last name" value={form.last_name} onChange={(value) => setForm((current) => ({ ...current, last_name: value }))} required={false} />
                <InfoCard label="Email" value={selected.email || "No email"} />
                <ActionButton type="submit" disabled={busy}>Save patient details</ActionButton>
                {notice ? <p className="text-xs text-rose-700">{notice}</p> : null}
              </form>
            </>
          ) : (
            <EmptyState icon={Users} title="No patient selected" detail="Select a patient to review the record." />
          )}
        </aside>
      </div>
    </FrontDeskShell>
  );
}

function OperationsView({ data, onAction, load }) {
  const summary = data?.summary || {};
  const [department, setDepartment] = useState({ name: "", description: "" });
  const [periodStart, setPeriodStart] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const createDepartment = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await onAction({
        scope: "frontdesk.department",
        label: "Create department",
        path: "/departments",
        method: "POST",
        body: { name: department.name.trim(), description: department.description.trim() || null },
        successMessage: "Department created",
      });
      setDepartment({ name: "", description: "" });
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const generateReport = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await onAction({
        scope: "frontdesk.report",
        label: "Generate utilisation report",
        path: "/reports/generate/utilisation",
        method: "POST",
        body: { period_start: periodStart, period_end: periodEnd },
        successMessage: "Utilisation report generated",
      });
      setReport(response?.data || response);
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FrontDeskShell
      eyebrow="Operations"
      title="Reception operations"
      detail="Review live analytics, create departments, and generate utilisation reports."
      icon={ClipboardList}
      refresh={load}
      stats={[
        { label: "Appointments", value: summary.appointments_total ?? data.appointments.length },
        { label: "Completed", value: summary.completed_visits_total ?? 0 },
        { label: "Cancellations", value: summary.cancelled_appointments_total ?? 0 },
        { label: "Patients", value: summary.patients_total ?? data.patients.length },
      ]}
    >
      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 p-3">
          <h3 className="text-[13px] font-semibold text-[#173b4a]">Create department</h3>
          <form onSubmit={createDepartment} className="mt-3 space-y-2.5">
            <Field label="Name" value={department.name} onChange={(value) => setDepartment((current) => ({ ...current, name: value }))} />
            <Field label="Description" value={department.description} onChange={(value) => setDepartment((current) => ({ ...current, description: value }))} required={false} />
            <ActionButton type="submit" disabled={busy || !department.name.trim()}>Create department</ActionButton>
          </form>
        </section>
        <section className="rounded-lg border border-slate-200 p-3">
          <h3 className="text-[13px] font-semibold text-[#173b4a]">Utilisation report</h3>
          <form onSubmit={generateReport} className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <Field label="Period start" value={periodStart} onChange={setPeriodStart} type="date" />
            <Field label="Period end" value={periodEnd} onChange={setPeriodEnd} type="date" />
            <div className="sm:col-span-2">
              <ActionButton type="submit" disabled={busy}>Generate report</ActionButton>
            </div>
          </form>
          {report ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <InfoCard label="Booked" value={report.appointments_booked} />
              <InfoCard label="Completed" value={report.completed_visits} />
              <InfoCard label="Cancellations" value={report.cancellations} />
              <InfoCard label="Patients" value={report.total_patients} />
            </div>
          ) : null}
        </section>
      </div>
      {notice ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{notice}</p> : null}
    </FrontDeskShell>
  );
}

function FrontDeskShell({ eyebrow, title, detail, icon: Icon, refresh, stats, children }) {
  return (
    <div className="h-full min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#168479]">
              <Icon size={14} /> {eyebrow}
            </div>
            <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-[#173b4a]">{title}</h2>
            {detail ? <p className="mt-1 max-w-2xl text-[13px] text-slate-500">{detail}</p> : null}
          </div>
          <button type="button" onClick={refresh} className="h-9 rounded-xl border border-slate-200 px-3.5 text-[12px] font-semibold text-[#106963] hover:bg-slate-50">
            Refresh
          </button>
        </header>
        <div className="grid grid-cols-2 border-b border-slate-200 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border-r border-slate-100 px-4 py-3 last:border-r-0">
              <p className="text-[18px] font-semibold tracking-[-0.02em] text-[#173b4a]">{stat.value}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = true }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100" />
    </label>
  );
}
