import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { login, register, createClient } from "./api";
import { AppShell } from "./components/AppShell";
import { AssistantPanel } from "./components/AssistantPanel";
import { Toast } from "./components/Toast";
import { ensureItems, makeId, ROLES, tokenSubject } from "./lib/workspace";
import { AdminView } from "./views/AdminView";
import { FrontDeskView } from "./views/FrontDeskView";
import { OverviewView } from "./views/OverviewView";
import { PatientView } from "./views/PatientView";
import { ProviderView } from "./views/ProviderView";

export default function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem("smarthealth-session") || "null"));

  const enter = (next) => {
    localStorage.setItem("smarthealth-session", JSON.stringify(next));
    setSession(next);
  };

  const logout = () => {
    localStorage.removeItem("smarthealth-session");
    setSession(null);
  };

  return session ? <Workspace session={session} onLogout={logout} /> : <Login onLogin={enter} />;
}

function Login({ onLogin }) {
  const [role, setRole] = useState("patient");
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(ROLES.patient.email);
  const [password, setPassword] = useState("secret123");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowSelfServiceAdminRegistration = import.meta.env.VITE_ALLOW_SELF_SERVICE_ADMIN_REGISTRATION === "true";
  const visibleRoles = Object.entries(ROLES);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        if (role === "admin") {
          throw new Error("Admin registration is disabled. Administrator accounts cannot be self-registered.");
        }

        const [first_name, ...rest] = fullName.trim().split(/\s+/);
        const last_name = rest.length ? rest.join(" ") : "";

        await register({
          email,
          password,
          role,
          first_name: first_name || null,
          last_name: last_name || null,
        });
      }
      const token = await login(email, password);
      const authed = createClient(token.access_token);
      let me = null;
      try {
        me = await authed("/auth/me");
      } catch {
        me = null;
      }
      onLogin({
        token: token.access_token,
        email: me?.email || email,
        role: me?.role || role,
        userId: me?.id || tokenSubject(token.access_token),
        patientId: me?.patient_id || null,
        providerId: me?.provider_id || null,
        profile: me,
      });
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="dashboard-shell dashboard-bg h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto grid h-full w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_30px_100px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:grid-cols-[1fr_1.08fr]">
        <aside className="hidden bg-[#0e2741] p-10 text-white lg:block">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[#8ccfc1] text-[#0e2741]">
                <HeartIcon />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ccfc1]">SmartHealth</p>
                <p className="text-sm text-slate-300">Clinical workspace</p>
              </div>
            </div>
            <div className="mt-16 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ccfc1]">Dashboard</p>
              <h1 className="mt-4 text-5xl font-semibold leading-tight">
                Clean clinical operations in one workspace.
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-7 text-slate-300">
                Role-based care operations for bookings, visits, analytics, and day-to-day clinic work.
              </p>
            </div>
          </div>
        </aside>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0f766e]">
                {mode === "login" ? "Sign in" : "Create access"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">Choose a role</h2>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              Secure access
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {visibleRoles.map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setRole(key);
                  setEmail(item.email);
                  setError("");
                }}
                className={`rounded-[18px] border p-4 text-left transition-all ${
                  role === key
                    ? "border-[#0f766e] bg-[#e7f5f2] text-[#0f766e] shadow-xs"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs leading-5">{item.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex rounded-[18px] bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-[14px] py-2.5 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-[14px] py-2.5 text-sm font-semibold transition ${
                mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" ? <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Ada Lovelace" /> : null}
            <Field label="Email" value={email} onChange={setEmail} />
            <Field label="Password" type="password" value={password} onChange={setPassword} />
            {error && (
              <div className="flex items-start gap-2.5 rounded-[18px] border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
                <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <button
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#0f766e] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#0b665f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Connecting..." : mode === "login" ? `Enter as ${ROLES[role].label}` : `Create ${ROLES[role].label} account`}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Workspace({ session, onLogout }) {
  const [active, setActive] = useState("Overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [conversationId] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : makeId("conv")));
  const [conversation, setConversation] = useState([]);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const [data, setData] = useState({
    health: null,
    summary: null,
    sessionUserId: session.userId,
    departments: [],
    services: [],
    providerServices: [],
    providers: [],
    slots: [],
    appointments: [],
    patients: [],
    ownProvider: null,
    patientProfile: null,
    me: session.profile || null,
    aiAnalytics: null,
  });
  const [loading, setLoading] = useState(false);

  const role = (data.me?.role && ROLES[data.me.role] ? data.me.role : null) || (ROLES[session.role] ? session.role : "patient");
  const client = createClient(session.token);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const runTracked = async ({
    label,
    path,
    method = "GET",
    body,
    headers = {},
    successMessage,
    correlationId = makeId("corr"),
  }) => {
    const requestId = makeId("req");
    try {
      const response = await client(path, {
        method,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers: {
          "X-Correlation-ID": correlationId,
          "X-Request-ID": requestId,
          ...headers,
        },
      });
      if (successMessage) notify(successMessage);
      return response;
    } catch (caught) {
      notify(caught.message);
      throw caught;
    }
  };

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const errors = [];
      const fetchSection = async (label, promise, fallback, options = {}) => {
        try {
          return await promise;
        } catch (error) {
          const suppressedStatuses = options.suppressStatuses || [];
          if (!suppressedStatuses.includes(error.status)) {
            errors.push(`${label}: ${error.message}`);
          }
          return typeof fallback === "function" ? fallback(error) : fallback;
        }
      };

      const me = await fetchSection("Profile", client("/auth/me"), session.profile || null, { suppressStatuses: [401, 403] });
      const resolvedRole = (me?.role && ROLES[me.role] ? me.role : null) || role;
      const loadPatientDirectory = async () => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            return await client("/patients?limit=100&offset=0");
          } catch (error) {
            if (error.status !== 503 || attempt === 1) throw error;
            await new Promise((resolve) => window.setTimeout(resolve, 400));
          }
        }
        return { items: [] };
      };

      const [
        health,
        summary,
        departments,
        services,
        providers,
        slots,
        appointments,
        patients,
        patientProfile,
        aiAnalytics,
      ] = await Promise.all([
        fetchSection("Health", client("/health/ready"), { status: "not_ready", checks: { api: "unavailable" } }),
        resolvedRole === "admin" || resolvedRole === "front_desk"
          ? fetchSection("Analytics", client("/analytics/summary"), { error: "Analytics unavailable" })
          : Promise.resolve(null),
        fetchSection("Departments", client("/departments?limit=100&offset=0"), { items: [] }),
        fetchSection("Services", client("/services?limit=100&offset=0"), { items: [] }),
        fetchSection("Providers", client("/providers?limit=100&offset=0"), { items: [] }),
        fetchSection("Slots", client("/slots?limit=100&offset=0"), { items: [] }),
        fetchSection("Appointments", client("/appointments?limit=100&offset=0"), { items: [] }),
        resolvedRole === "admin" || resolvedRole === "front_desk" || resolvedRole === "provider"
          ? fetchSection("Patients", loadPatientDirectory(), (error) => ({ items: [], error: error.message }), { suppressStatuses: [503] })
          : Promise.resolve({ items: [] }),
        resolvedRole === "patient" && (me?.patient_id || session.patientId || session.userId)
          ? fetchSection(
              "Patient profile",
              client(`/patients/${me?.patient_id || session.patientId || session.userId}`),
              () => ({
                id: me?.patient_id || session.patientId || session.userId,
                email: me?.email || session.email,
                first_name: me?.first_name,
                last_name: me?.last_name,
              }),
              { suppressStatuses: [403] },
            )
          : Promise.resolve(null),
        resolvedRole === "admin"
          ? fetchSection("AI analytics", client("/analytics/ai"), { error: "AI analytics unavailable" })
          : Promise.resolve(null),
      ]);

      const providerItems = ensureItems(providers);
      const ownProvider = providerItems.find((item) => String(item.user_id) === String(session.userId))
        || providerItems.find((item) => String(item.id) === String(me?.provider_id || session.providerId))
        || null;
      const providerServices = ownProvider
        ? await client(`/providers/${ownProvider.id}/services?limit=100&offset=0`).catch(() => ({ items: [] }))
        : { items: [] };

      setData({
        health,
        summary,
        sessionUserId: session.userId,
        departments: ensureItems(departments),
        services: ensureItems(services),
        providerServices: ensureItems(providerServices),
        providers: providerItems,
        slots: ensureItems(slots),
        appointments: ensureItems(appointments),
        patients: ensureItems(patients),
        patientDirectoryError: patients?.error || null,
        ownProvider,
        patientProfile,
        me,
        aiAnalytics,
      });

      if (errors.length) {
        setLoadError(`Some workspace data could not be refreshed. ${errors.slice(0, 2).join(" ")}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askAssistant = async (question) => {
    setAssistantBusy(true);
    const userEntry = { id: makeId("msg"), role: "user", text: question };
    setConversation((current) => [...current, userEntry]);
    try {
      const response = await runTracked({
        scope: "assistant.ask",
        label: "Ask care navigator",
        path: "/assistant/ask",
        method: "POST",
        body: { question, conversation_id: conversationId },
      });
      const answer = response?.data?.answer || response?.answer || "No answer returned.";
      setConversation((current) => [
        ...current,
        {
          id: makeId("msg"),
          role: "assistant",
          text: answer,
          citations: response?.data?.citations || [],
        },
      ]);
    } catch (error) {
      setConversation((current) => [
        ...current,
        { id: makeId("msg"), role: "assistant", text: error.message || "The assistant is unavailable right now." },
      ]);
    } finally {
      setAssistantBusy(false);
    }
  };

  const currentTab = active;

  const content = (
    <>
      {currentTab === "Overview" ? (
        <OverviewView role={role} session={session} data={data} onNavigate={setActive} />
      ) : null}
      {role === "patient" && currentTab !== "Overview" ? (
        <PatientView active={currentTab} data={data} onAction={runTracked} load={load} onNavigate={setActive} onLogout={onLogout} />
      ) : null}
      {role === "provider" && currentTab !== "Overview" ? (
        <ProviderView active={currentTab} data={data} onAction={runTracked} load={load} />
      ) : null}
      {role === "front_desk" && currentTab !== "Overview" ? (
        <FrontDeskView active={currentTab} data={data} onAction={runTracked} load={load} />
      ) : null}
      {role === "admin" && currentTab !== "Overview" ? (
        <AdminView active={currentTab} data={data} onAction={runTracked} load={load} />
      ) : null}
    </>
  );

  return (
    <AppShell
      role={role}
      session={session}
      data={data}
      onAction={runTracked}
      load={load}
      active={active}
      setActive={setActive}
      onLogout={onLogout}
      onRefresh={load}
      loading={loading}
      loadError={loadError}
      healthStatus={data.health?.status}
      mobileNavOpen={mobileNavOpen}
      setMobileNavOpen={setMobileNavOpen}
      onOpenAssistant={() => {
        setAssistantOpen(true);
      }}
    >
      {content}
      <AssistantPanel
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onAsk={askAssistant}
        busy={assistantBusy}
        conversation={conversation}
      />
      <Toast message={toast} />
    </AppShell>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function HeartIcon() {
  return <span className="text-lg font-bold">+</span>;
}
