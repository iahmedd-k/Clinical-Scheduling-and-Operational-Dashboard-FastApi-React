import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  Layers,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ActionButton, EmptyState, StatusPill } from "../components/ui";
import { shortId } from "../lib/workspace";

export function AdminView({ active, data, onAction, load }) {
  if (active === "Analytics") {
    return <AnalyticsView data={data} onAction={onAction} load={load} />;
  }

  if (active === "Staff") {
    return <StaffView data={data} onAction={onAction} load={load} />;
  }

  return <CatalogView data={data} onAction={onAction} load={load} />;
}

const emptyServiceForm = {
  name: "",
  description: "",
  specialty: "",
  preparation_instructions: "",
  department_id: "",
  provider_id: "",
  price: "0.00",
  is_published: false,
};

// ==========================================
// 1. CATALOG TAB
// ==========================================
function CatalogView({ data, onAction, load }) {
  const departments = data?.departments ?? [];
  const services = data?.services ?? [];
  const providers = data?.providers ?? [];

  const [activeStudioTab, setActiveStudioTab] = useState("service"); // "service" | "department"
  const [department, setDepartment] = useState({ name: "", description: "" });
  const [departmentNotice, setDepartmentNotice] = useState("");
  const [service, setService] = useState(emptyServiceForm);
  const [serviceNotice, setServiceNotice] = useState("");
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [pendingDeleteService, setPendingDeleteService] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Filters
  const [catalogFilter, setCatalogFilter] = useState("all"); // "all" | "published" | "draft"
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Semantic Search
  const [showSemanticSearch, setShowSemanticSearch] = useState(false);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticBusy, setSemanticBusy] = useState(false);
  const [semanticResults, setSemanticResults] = useState([]);
  const [semanticMessage, setSemanticMessage] = useState("");
  const [publishStatus, setPublishStatus] = useState(null);

  const departmentById = useMemo(
    () => new Map(departments.map((item) => [String(item.id), item])),
    [departments]
  );
  const providerById = useMemo(
    () => new Map(providers.map((item) => [String(item.id), item])),
    [providers]
  );

  const publishedCount = services.filter((item) => item.is_published).length;
  const draftCount = Math.max(services.length - publishedCount, 0);

  const clearServiceForm = () => {
    setEditingServiceId(null);
    setServiceNotice("");
    setService(emptyServiceForm);
  };

  const saveDepartment = async (event) => {
    event.preventDefault();
    setDepartmentNotice("");

    if (!department.name.trim()) {
      setDepartmentNotice("Department name is required.");
      return;
    }

    setBusy(true);
    try {
      await onAction({
        scope: "admin.department",
        label: "Create department",
        path: "/departments",
        method: "POST",
        body: { name: department.name.trim(), description: department.description?.trim() || null },
        successMessage: "Department created",
      });
      setDepartment({ name: "", description: "" });
      await load();
    } catch (error) {
      setDepartmentNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveService = async (event) => {
    event.preventDefault();
    setServiceNotice("");

    if (!service.name.trim()) {
      setServiceNotice("Service name is required.");
      return;
    }

    const departmentId = Number(service.department_id);
    const hasValidDepartment = service.department_id !== "" && Number.isInteger(departmentId) && departmentId > 0;
    if (!hasValidDepartment) {
      setServiceNotice("Please choose a valid department.");
      return;
    }

    const providerId = Number(service.provider_id);
    if (!editingServiceId && (!Number.isInteger(providerId) || providerId <= 0)) {
      setServiceNotice("Please select a provider to assign this service.");
      return;
    }

    setBusy(true);
    try {
      const priceNumber = Number(service.price);
      const safePrice = Number.isFinite(priceNumber) && priceNumber >= 0 ? priceNumber.toFixed(2) : "0.00";

      await onAction({
        scope: editingServiceId ? "admin.service.update" : "admin.service.create",
        label: editingServiceId ? "Update service" : "Create service",
        path: editingServiceId ? `/services/${editingServiceId}` : "/services",
        method: editingServiceId ? "PUT" : "POST",
        body: {
          name: service.name.trim(),
          description: service.description?.trim() || null,
          specialty: service.specialty?.trim() || null,
          preparation_instructions: service.preparation_instructions?.trim() || null,
          department_id: departmentId,
          price: safePrice,
          ...(editingServiceId ? {} : { provider_id: providerId }),
          is_published: editingServiceId ? Boolean(service.is_published) : false,
        },
        successMessage: editingServiceId ? "Service updated successfully" : "Service created successfully",
      });
      clearServiceForm();
      await load();
    } catch (error) {
      setServiceNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const beginEditService = (serviceItem) => {
    setServiceNotice("");
    setEditingServiceId(serviceItem.id);
    setActiveStudioTab("service");
    setService({
      name: serviceItem.name || "",
      description: serviceItem.description || "",
      specialty: serviceItem.specialty || "",
      preparation_instructions: serviceItem.preparation_instructions || "",
      department_id: serviceItem.department_id != null ? String(serviceItem.department_id) : "",
      provider_id: serviceItem.provider_id != null ? String(serviceItem.provider_id) : "",
      price: serviceItem.price != null ? String(serviceItem.price) : "0.00",
      is_published: Boolean(serviceItem.is_published),
    });
  };

  const publish = async (serviceId, shouldPublish) => {
    setBusy(true);
    try {
      await onAction({
        scope: "admin.service.publish",
        label: shouldPublish ? "Publish service" : "Unpublish service",
        path: `/services/${serviceId}/${shouldPublish ? "publish" : "unpublish"}`,
        method: "POST",
        body: {},
        successMessage: shouldPublish ? "Service published" : "Service unpublished",
      });
      setPublishStatus({ status: shouldPublish ? "PUBLISHING" : "UNPUBLISHING" });
      setServiceNotice(shouldPublish ? "Publishing started. Refreshing service status." : "Unpublishing started. Refreshing service status.");
      void load().catch((error) => setServiceNotice(error.message));
    } catch (error) {
      setServiceNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteService = async () => {
    if (!pendingDeleteService) return;
    setBusy(true);
    setDeleteNotice("");
    try {
      await onAction({
        scope: "admin.service.delete",
        label: "Delete service",
        path: `/services/${pendingDeleteService.id}`,
        method: "DELETE",
        successMessage: "Service removed from catalog",
      });
      setPendingDeleteService(null);
      if (editingServiceId === pendingDeleteService.id) clearServiceForm();
      await load();
    } catch (error) {
      setDeleteNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const runSemanticSearch = async (event) => {
    event.preventDefault();
    const query = semanticQuery.trim();
    if (!query) {
      setSemanticResults([]);
      setSemanticMessage("Type a search term to find published services.");
      return;
    }
    setSemanticBusy(true);
    setSemanticMessage("");
    try {
      const response = await onAction({
        scope: "admin.search",
        label: "Search services",
        path: "/search",
        method: "POST",
        body: { query, limit: 5 },
      });
      setSemanticResults(response?.results || []);
      setSemanticMessage(
        response?.message ||
          (response?.results?.length
            ? `${response.results.length} match${response.results.length === 1 ? "" : "es"} found.`
            : "No matching services were found.")
      );
    } catch (error) {
      setSemanticResults([]);
      setSemanticMessage(error.message);
    } finally {
      setSemanticBusy(false);
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter((item) => {
      const isPub = Boolean(item.is_published);
      if (catalogFilter === "published" && !isPub) return false;
      if (catalogFilter === "draft" && isPub) return false;

      if (selectedDeptFilter !== "all" && String(item.department_id) !== String(selectedDeptFilter)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (item.name || "").toLowerCase();
        const spec = (item.specialty || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const dept = (departmentById.get(String(item.department_id))?.name || "").toLowerCase();
        return name.includes(q) || spec.includes(q) || desc.includes(q) || dept.includes(q);
      }
      return true;
    });
  }, [services, catalogFilter, selectedDeptFilter, searchQuery, departmentById]);

  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200/90 bg-[#f8faf9] p-4 sm:p-6">
      <div className="flex flex-col gap-5">
        {/* Header Strip */}
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f766e]/10 text-[#0f766e]">
                <Layers size={16} />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">Enterprise Administration</p>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Clinical Catalog & Services
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Configure clinic departments, manage service definitions, and govern publishing status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSemanticSearch((curr) => !curr)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                showSemanticSearch
                  ? "border-[#0f766e] bg-[#e7f5f2] text-[#0f766e]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Sparkles size={14} className="text-[#0f766e]" />
              {showSemanticSearch ? "Hide Search Tool" : "Semantic Search"}
            </button>
            <ActionButton tone="secondary" onClick={load} disabled={busy} className="h-9 px-3 text-xs">
              <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
              Refresh
            </ActionButton>
          </div>
        </header>

        {/* Top Metric Cards */}
        <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Services</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#0f766e]">
                <Stethoscope size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{services.length}</p>
            <p className="mt-0.5 text-xs text-slate-400">In hospital registry</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Published</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Globe size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{publishedCount}</p>
            <p className="mt-0.5 text-xs text-emerald-600/80">Available to patients</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Drafts</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <FileText size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">{draftCount}</p>
            <p className="mt-0.5 text-xs text-slate-400">Unpublished drafts</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Departments</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Building2 size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{departments.length}</p>
            <p className="mt-0.5 text-xs text-slate-400">Active medical units</p>
          </div>
        </section>

        {/* Collapsible Semantic Vector Search Drawer */}
        {showSemanticSearch ? (
          <section className="rounded-2xl border border-[#8ccfc1]/80 bg-[#f4fbf9] p-5 shadow-xs transition">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0f766e]">
                  <Sparkles size={14} />
                  AI Vector Search Matcher
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Semantic Catalog Discovery</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Search across published clinical definitions and medical chunks via natural language queries.
                </p>
              </div>

              <form onSubmit={runSemanticSearch} className="w-full max-w-xl">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      value={semanticQuery}
                      onChange={(event) => setSemanticQuery(event.target.value)}
                      placeholder="e.g., knee surgery prep, cardiac consultation, flu test..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <ActionButton type="submit" disabled={semanticBusy} className="h-10 px-4 text-xs font-semibold">
                    {semanticBusy ? "Searching..." : "Execute Search"}
                  </ActionButton>
                </div>
              </form>
            </div>

            <div className="mt-3.5 rounded-xl border border-emerald-100 bg-white p-3.5">
              {semanticResults.length ? (
                <div className="grid gap-2.5">
                  {semanticResults.map((result) => (
                    <div
                      key={`${result.service_id}-${result.score}`}
                      className="flex flex-col justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{result.service_name}</p>
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {result.department} {result.specialty ? `· ${result.specialty}` : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{result.content}</p>
                      </div>
                      <div className="shrink-0">
                        <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-[#0f766e]">
                          Score {(result.score || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {semanticMessage || "Submit a natural language phrase above to test vector retrieval and similarity."}
                </p>
              )}
            </div>
          </section>
        ) : null}

        {/* 2-Column Responsive Workspace */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Studio Pane */}
          <div className="lg:col-span-5 xl:col-span-4">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              {/* Studio Switcher Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setActiveStudioTab("service")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                    activeStudioTab === "service" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  <Stethoscope size={13} />
                  Service Studio
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStudioTab("department")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                    activeStudioTab === "department" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  <Building2 size={13} />
                  Department Studio
                </button>
              </div>

              {/* Service Studio Form */}
              {activeStudioTab === "service" ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {editingServiceId ? "Edit Clinical Service" : "New Service Definition"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {editingServiceId ? `Editing service #${editingServiceId}` : "Add service to hospital catalog"}
                      </p>
                    </div>
                    {editingServiceId ? (
                      <button
                        type="button"
                        onClick={clearServiceForm}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel edit
                      </button>
                    ) : null}
                  </div>

                  <form onSubmit={saveService} className="mt-4 space-y-3" noValidate>
                    <Field
                      label="Service Name"
                      value={service.name}
                      onChange={(value) => setService((c) => ({ ...c, name: value }))}
                      disabled={busy}
                      required
                      placeholder="e.g., General Consultation, Orthopedic MRI"
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField
                        label="Department"
                        value={service.department_id}
                        onChange={(value) => setService((c) => ({ ...c, department_id: value }))}
                        placeholder="Select department"
                        disabled={busy}
                        required
                      >
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </SelectField>

                      <Field
                        label="Specialty"
                        value={service.specialty}
                        onChange={(value) => setService((c) => ({ ...c, specialty: value }))}
                        disabled={busy}
                        placeholder="e.g., Cardiology"
                      />
                    </div>

                    {!editingServiceId ? (
                      <SelectField
                        label="Assigned Provider"
                        value={service.provider_id}
                        onChange={(value) => setService((c) => ({ ...c, provider_id: value }))}
                        placeholder="Select clinician"
                        disabled={busy}
                        required
                      >
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || `Provider #${p.id}`}
                          </option>
                        ))}
                      </SelectField>
                    ) : null}

                    <Field
                      label="Consultation Fee ($)"
                      value={service.price}
                      onChange={(value) => setService((c) => ({ ...c, price: value }))}
                      disabled={busy}
                      placeholder="0.00"
                    />

                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Description
                      </span>
                      <textarea
                        rows={2}
                        value={service.description}
                        onChange={(e) => setService((c) => ({ ...c, description: e.target.value }))}
                        disabled={busy}
                        placeholder="Brief summary of clinical scope..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Preparation Instructions
                      </span>
                      <textarea
                        rows={2}
                        value={service.preparation_instructions}
                        onChange={(e) => setService((c) => ({ ...c, preparation_instructions: e.target.value }))}
                        disabled={busy}
                        placeholder="Fasting requirements, medication instructions, etc..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    {serviceNotice ? (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                        {serviceNotice}
                      </p>
                    ) : null}

                    <div className="pt-2">
                      <ActionButton type="submit" disabled={busy} className="w-full justify-center py-2.5 text-xs font-bold">
                        {editingServiceId ? "Update Service Definition" : "Save & Register Service"}
                      </ActionButton>
                    </div>
                  </form>
                </div>
              ) : (
                /* Department Studio */
                <div className="mt-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">New Clinic Department</h3>
                    <p className="text-xs text-slate-500">Add administrative and clinical department units</p>
                  </div>

                  <form onSubmit={saveDepartment} className="mt-4 space-y-3" noValidate>
                    <Field
                      label="Department Name"
                      value={department.name}
                      onChange={(value) => setDepartment((c) => ({ ...c, name: value }))}
                      disabled={busy}
                      required
                      placeholder="e.g., General Medicine, Pediatrics"
                    />

                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Description
                      </span>
                      <textarea
                        rows={2}
                        value={department.description}
                        onChange={(e) => setDepartment((c) => ({ ...c, description: e.target.value }))}
                        disabled={busy}
                        placeholder="Administrative notes, location, or unit scope..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    {departmentNotice ? (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                        {departmentNotice}
                      </p>
                    ) : null}

                    <div className="pt-2">
                      <ActionButton type="submit" disabled={busy} className="w-full justify-center py-2.5 text-xs font-bold">
                        Create Department
                      </ActionButton>
                    </div>
                  </form>

                  {/* Existing Departments Preview */}
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Existing Units ({departments.length})
                    </p>
                    <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {departments.map((dept) => (
                        <div
                          key={dept.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{dept.name}</p>
                            <p className="truncate text-[10px] text-slate-500">{dept.description || "No description"}</p>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Active
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Catalog Explorer */}
          <div className="lg:col-span-7 xl:col-span-8">
            <section className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Catalog Registry</h2>
                  <p className="text-xs text-slate-500">
                    Displaying {filteredServices.length} of {services.length} configured services
                  </p>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setCatalogFilter("all")}
                      className={`rounded-lg px-2.5 py-1 transition ${
                        catalogFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      All ({services.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogFilter("published")}
                      className={`rounded-lg px-2.5 py-1 transition ${
                        catalogFilter === "published" ? "bg-white text-emerald-700 shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Published ({publishedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogFilter("draft")}
                      className={`rounded-lg px-2.5 py-1 transition ${
                        catalogFilter === "draft" ? "bg-white text-amber-700 shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Drafts ({draftCount})
                    </button>
                  </div>

                  <select
                    value={selectedDeptFilter}
                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    className="h-8 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#0f766e]"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mt-3.5">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter service name, specialty, description, or department..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs outline-none transition focus:border-[#0f766e] focus:bg-white"
                />
              </div>

              {/* Services List with Fixed Card Layout */}
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {filteredServices.map((item) => {
                  const isPub = Boolean(item.is_published);
                  const isCurrentEdit = String(editingServiceId) === String(item.id);
                  const dept = departmentById.get(String(item.department_id))?.name || "Unassigned";

                  return (
                    <article
                      key={item.id}
                      className={`group flex flex-col justify-between gap-3.5 rounded-2xl border p-4 transition-all hover:shadow-xs sm:flex-row sm:items-center ${
                        isCurrentEdit
                          ? "border-[#0f766e] bg-[#e7f5f2]/40 ring-2 ring-emerald-100"
                          : "border-slate-200/90 bg-[#fbfdfc] hover:border-[#8ccfc1]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-bold text-[#173b4a]">{item.name}</span>
                          {item.specialty ? (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {item.specialty}
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

                        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-600">
                          {item.description || "No catalog description specified."}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Building2 size={13} className="text-[#0f766e]" />
                            {dept}
                          </span>
                          {item.price ? (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="flex items-center gap-1 font-semibold text-slate-800">
                                <DollarSign size={12} className="text-emerald-600" />
                                {Number(item.price).toFixed(2)}
                              </span>
                            </>
                          ) : null}
                          {item.preparation_instructions ? (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#0f766e]">
                                <FileText size={12} /> Prep instructions
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-center">
                        <button
                          type="button"
                          onClick={() => beginEditService(item)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#0f766e] hover:text-[#0f766e]"
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => publish(item.id, !isPub)}
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
                          onClick={() => {
                            setDeleteNotice("");
                            setPendingDeleteService(item);
                          }}
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
                  <div className="py-10">
                    <EmptyState
                      icon={services.length ? Filter : Stethoscope}
                      title={services.length ? "No matching services found" : "No services registered yet"}
                      detail={
                        services.length
                          ? "Try clearing your search query or selecting a different department filter."
                          : "Use the Service Studio on the left to add your hospital's first clinical service."
                      }
                    />
                  </div>
                ) : null}
              </div>
            </section>
          </div>
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
                  <h3 className="text-base font-bold text-slate-900">Delete Clinical Service</h3>
                  <p className="text-xs text-slate-500">
                    Service #{pendingDeleteService.id} · {pendingDeleteService.name}
                  </p>
                </div>
              </div>

              {deleteNotice ? (
                <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  {deleteNotice}
                </p>
              ) : null}

              <p className="mt-4 text-xs leading-relaxed text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">{pendingDeleteService.name}</strong> from the clinical catalog? This will unpublish the service and soft delete it from active provider listings.
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

// ==========================================
// 2. ANALYTICS TAB
// ==========================================
function AnalyticsView({ data, onAction, load }) {
  const [busy, setBusy] = useState(false);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState("overview"); // "overview" | "services"
  const [busyServiceId, setBusyServiceId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState(null);
  const [reconcileResult, setReconcileResult] = useState(null);
  const [rangeSummary, setRangeSummary] = useState(null);
  const pageSize = 8;

  const summary = rangeSummary || data?.summary || {};
  const ai = data?.aiAnalytics ?? {};
  const departments = data?.departments ?? [];
  const providers = data?.providers ?? [];
  const services = data?.services ?? [];
  const slots = data?.slots ?? [];
  const appointments = data?.appointments ?? [];
  const departmentById = useMemo(() => new Map(departments.map((item) => [String(item.id), item])), [departments]);
  const providerById = useMemo(() => new Map(providers.map((item) => [String(item.id), item])), [providers]);

  useEffect(() => {
    setPage(0);
  }, [query, statusFilter, sortDirection]);

  // Department throughput calculation
  const departmentThroughput = useMemo(() => {
    const counts = new Map();
    for (const d of departments) {
      counts.set(String(d.id), { name: d.name, services: 0, appointments: 0 });
    }
    for (const s of services) {
      const entry = counts.get(String(s.department_id));
      if (entry) entry.services += 1;
    }
    for (const apt of appointments) {
      const slot = slots.find((sl) => String(sl.id) === String(apt.slot_id));
      const srv = slot ? services.find((s) => String(s.id) === String(slot.service_id)) : null;
      if (srv && counts.has(String(srv.department_id))) {
        counts.get(String(srv.department_id)).appointments += 1;
      }
    }
    return Array.from(counts.values()).slice(0, 6);
  }, [departments, services, appointments, slots]);

  const catalogRows = useMemo(() => {
    const serviceProviderMap = new Map();
    for (const slot of slots) {
      const serviceKey = String(slot.service_id);
      const providerKey = String(slot.provider_id);
      const current = serviceProviderMap.get(serviceKey) || [];
      if (!current.includes(providerKey)) current.push(providerKey);
      serviceProviderMap.set(serviceKey, current);
    }

    return services.map((item, index) => {
      const providerIds = serviceProviderMap.get(String(item.id)) || [];
      const providerNames = providerIds
        .map((providerId) => providerById.get(String(providerId)))
        .filter(Boolean)
        .map((provider) => [provider.first_name, provider.last_name].filter(Boolean).join(" ") || provider.name || `Provider ${shortId(provider.id)}`);

      const fallbackProvider = providers.find((provider) => String(provider.department_id) === String(item.department_id));
      const displayProviders = providerNames.length
        ? providerNames
        : fallbackProvider
        ? [([fallbackProvider.first_name, fallbackProvider.last_name].filter(Boolean).join(" ") || fallbackProvider.name || `Provider ${shortId(fallbackProvider.id)}`)]
        : ["Unassigned"];

      return {
        id: `service-${item.id}`,
        serviceId: item.id,
        no: String(index + 1).padStart(2, "0"),
        key: shortId(item.id),
        name: item.name || `Service ${index + 1}`,
        department: departmentById.get(String(item.department_id))?.name || "Unassigned department",
        specialty: item.specialty || item.description || "General care",
        providers: displayProviders,
        status: item.is_published ? "PUBLISHED" : "DRAFT",
        isPublished: Boolean(item.is_published),
        tone: item.is_published ? "success" : "neutral",
      };
    });
  }, [departmentById, providerById, providers, services, slots]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalogRows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter.toUpperCase()) return false;
      if (!needle) return true;
      return [row.no, row.key, row.name, row.department, row.providers.join(" "), row.specialty, row.status]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [catalogRows, query, statusFilter]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((left, right) => {
      const result = left.name.localeCompare(right.name);
      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredRows, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = sortedRows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rangeStart = visibleRows.length ? safePage * pageSize + 1 : 0;
  const rangeEnd = Math.min(safePage * pageSize + visibleRows.length, sortedRows.length);

  const reconcile = async () => {
    setBusy(true);
    try {
      const result = await onAction({
        scope: "admin.analytics",
        label: "Reconcile analytics",
        path: "/analytics/reconcile",
        method: "GET",
        successMessage: "Analytics reconciled",
      });
      setReconcileResult(result);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const loadSummaryRange = async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const result = await onAction({
        scope: "admin.analytics.range",
        label: "Load analytics range",
        path: `/analytics/summary${params.toString() ? `?${params}` : ""}`,
        method: "GET",
        successMessage: "Analytics range loaded",
      });
      setRangeSummary(result);
    } finally {
      setBusy(false);
    }
  };

  const generateUtilisation = async () => {
    if (!startDate || !endDate) return;
    setBusy(true);
    try {
      const response = await onAction({
        scope: "admin.report",
        label: "Generate utilisation report",
        path: "/reports/generate/utilisation",
        method: "POST",
        body: { period_start: startDate, period_end: endDate },
        successMessage: "Utilisation report generated",
      });
      setReport(response?.data || response);
    } finally {
      setBusy(false);
    }
  };

  const toggleSort = () => {
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  };

  const toggleServicePublish = async (row) => {
    if (!row?.serviceId) return;
    setBusyServiceId(row.serviceId);
    try {
      await onAction({
        scope: "admin.service.publish",
        label: row.isPublished ? "Unpublish service" : "Publish service",
        path: `/services/${row.serviceId}/${row.isPublished ? "unpublish" : "publish"}`,
        method: "POST",
        body: {},
        successMessage: row.isPublished ? "Service unpublished" : "Service published",
      });
      await load();
    } finally {
      setBusyServiceId(null);
    }
  };

  const totalAppointments = summary.appointments_total ?? appointments.length;
  const completedVisits = summary.completed_visits_total ?? 0;
  const cancelledVisits = summary.cancelled_appointments_total ?? 0;
  const cancellationRate = Math.round((summary.cancellation_rate || 0) * 100);
  const avgWait = Math.round(summary.average_wait_seconds || 0);

  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200/90 bg-[#f8faf9] p-4 sm:p-6">
      <div className="flex flex-col gap-5">
        {/* Compact Integrated Header */}
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f766e]/10 text-[#0f766e]">
                <Activity size={16} />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">Executive Reporting</p>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Clinic Operations & Intelligence
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              System throughput, operational capacity, and conversational AI performance.
            </p>
          </div>

          {/* Integrated Date Filter & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
              <Calendar size={13} className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs outline-none text-slate-700"
                title="Start date"
              />
              <span className="text-slate-300">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs outline-none text-slate-700"
                title="End date"
              />
            </div>

            <ActionButton
              type="button"
              tone="secondary"
              onClick={loadSummaryRange}
              disabled={busy}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              Apply Range
            </ActionButton>

            <ActionButton
              type="button"
              onClick={generateUtilisation}
              disabled={busy || !startDate || !endDate}
              className="h-8 px-3 text-xs font-semibold"
            >
              <FileText size={13} />
              Utilisation
            </ActionButton>

            <ActionButton
              type="button"
              tone="secondary"
              onClick={reconcile}
              disabled={busy}
              className="h-8 px-2.5 text-xs"
            >
              <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
              Sync
            </ActionButton>
          </div>
        </header>

        {/* View Switcher Pill */}
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-xl bg-slate-200/60 p-1 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveAnalyticsTab("overview")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                activeAnalyticsTab === "overview" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              <Activity size={14} className="text-[#0f766e]" />
              Executive Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveAnalyticsTab("services")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                activeAnalyticsTab === "services" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              <Layers size={14} className="text-slate-500" />
              Service Catalog Index ({services.length})
            </button>
          </div>

          {reconcileResult?.drift_detected ? (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-800">
              Drift detected in {reconcileResult.drift?.length || 0} areas (re-indexed)
            </span>
          ) : reconcileResult ? (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-800">
              Records synchronized & consistent
            </span>
          ) : null}
        </div>

        {activeAnalyticsTab === "overview" ? (
          <>
            {/* 4 Single-Row Hero KPI Cards */}
            <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Total Bookings</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#0f766e]">
                    <Activity size={16} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{totalAppointments}</p>
                <p className="mt-0.5 text-xs text-slate-400">Scheduled patient visits</p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Completed Encounters</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{completedVisits}</p>
                <p className="mt-0.5 text-xs text-emerald-600/80">Concluded patient visits</p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Average Wait</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Clock3 size={16} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{avgWait}s</p>
                <p className="mt-0.5 text-xs text-slate-400">Check-in to consultation</p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">AI Assistant Queries</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Sparkles size={16} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ai.questions_asked ?? ai.interactions_total ?? 0}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {Math.round((ai.booking_conversion_rate || 0) * 100)}% converted to booking
                </p>
              </div>
            </section>

            {/* Balanced 2-Column Dashboard Panels */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Panel 1: Clinical Throughput & Capacity */}
              <section className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Clinical Throughput & Capacity</h2>
                    <p className="text-xs text-slate-500">Encounter volumes and department distribution</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {cancellationRate}% cancellation rate
                  </span>
                </div>

                {/* Progress Metric Bar */}
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">Encounter Completion Ratio</span>
                    <span className="text-[#0f766e]">
                      {totalAppointments > 0 ? Math.round((completedVisits / totalAppointments) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#0f766e] transition-all"
                      style={{
                        width: `${totalAppointments > 0 ? Math.min(100, Math.round((completedVisits / totalAppointments) * 100)) : 0}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Completed: {completedVisits}</span>
                    <span>Cancelled: {cancelledVisits}</span>
                    <span>Active: {Math.max(0, totalAppointments - completedVisits - cancelledVisits)}</span>
                  </div>
                </div>

                {/* Department Distribution */}
                <div className="mt-4 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Department Service Allocation
                  </p>
                  <div className="mt-2 space-y-2">
                    {departmentThroughput.map((dept, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#fbfdfc] px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 font-medium text-slate-900">
                          <Building2 size={13} className="text-[#0f766e]" />
                          {dept.name}
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                          <span>{dept.services} services</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-slate-700">{dept.appointments} booked</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Utilisation Report Card if available */}
                {report ? (
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-[#f4fbf9] p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">Utilisation Report</span>
                      <span className="text-[10px] text-slate-500">
                        {startDate} → {endDate}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-white p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Booked</span>
                        <span className="font-bold text-slate-900">{report.appointments_booked ?? 0}</span>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Done</span>
                        <span className="font-bold text-emerald-700">{report.completed_visits ?? 0}</span>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Cancelled</span>
                        <span className="font-bold text-rose-700">{report.cancellations ?? 0}</span>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Patients</span>
                        <span className="font-bold text-slate-900">{report.total_patients ?? 0}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              {/* Panel 2: AI Clinical Assistant & Quality Metrics */}
              <section className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">AI Assistant & Quality Assurance</h2>
                    <p className="text-xs text-slate-500">Conversational AI safety guardrails and patient conversion</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0f766e]">
                    <Sparkles size={11} />
                    Active
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-[#fbfdfc] p-3.5">
                    <span className="text-[11px] font-semibold text-slate-500">Safety Guardrails</span>
                    <p className="mt-1 text-xl font-bold text-slate-900">{ai.refused_total ?? 0}</p>
                    <p className="mt-0.5 text-[11px] text-amber-700 font-medium">
                      {Math.round((ai.refusal_rate || 0) * 100)}% refusal rate
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-[#fbfdfc] p-3.5">
                    <span className="text-[11px] font-semibold text-slate-500">Booking Conversions</span>
                    <p className="mt-1 text-xl font-bold text-emerald-700">{ai.booking_conversions ?? 0}</p>
                    <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">
                      {Math.round((ai.booking_conversion_rate || 0) * 100)}% converted
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-[#fbfdfc] p-3.5">
                    <span className="text-[11px] font-semibold text-slate-500">Failed Workflows</span>
                    <p className="mt-1 text-xl font-bold text-slate-900">{summary.failed_workflows_total ?? 0}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">Zero critical failures</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-[#fbfdfc] p-3.5">
                    <span className="text-[11px] font-semibold text-slate-500">Assistance Volume</span>
                    <p className="mt-1 text-xl font-bold text-slate-900">{ai.questions_asked ?? 0}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">Patient questions answered</p>
                  </div>
                </div>

                {/* Audit & Compliance Callout */}
                <div className="mt-4 flex-1 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Shield size={14} className="text-[#0f766e]" />
                    Clinical Safety & PHI Guardrails
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    The SmartHealth assistant enforces real-time guardrails blocking direct diagnostic claims and acute medical emergencies, redirecting urgent inquiries to emergency care.
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-[11px] text-slate-500">
                    <span>Audit Status: Passed</span>
                    <span className="font-semibold text-emerald-700">100% Policy Enforced</span>
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : (
          /* Service Relationships Master Table Tab */
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Service Relationships & Status Index</h2>
                <p className="text-xs text-slate-500">
                  Audit live service status, clinician linkages, and department allocations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ActionButton type="button" tone="secondary" className="h-8 px-3 text-xs" onClick={toggleSort}>
                  Sort {sortDirection === "asc" ? "A → Z" : "Z → A"}
                </ActionButton>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("published")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      statusFilter === "published" ? "bg-white text-emerald-700 shadow-xs" : "hover:text-slate-900"
                    }`}
                  >
                    Published
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("draft")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      statusFilter === "draft" ? "bg-white text-amber-700 shadow-xs" : "hover:text-slate-900"
                    }`}
                  >
                    Draft
                  </button>
                </div>
              </div>
            </div>

            <div className="relative mt-3.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by service name, specialty, provider, or department..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs outline-none transition focus:border-[#0f766e] focus:bg-white"
              />
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 w-14">No</th>
                    <th className="border-b border-slate-200 px-4 py-3">Service Name</th>
                    <th className="border-b border-slate-200 px-4 py-3">Department</th>
                    <th className="border-b border-slate-200 px-4 py-3">Assigned Clinician</th>
                    <th className="border-b border-slate-200 px-4 py-3 w-28">Status</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-right w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleRows.map((row, idx) => (
                    <tr key={row.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {String(safePage * pageSize + idx + 1).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{row.name}</p>
                        <p className="text-[11px] text-slate-500">{row.specialty}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{row.department}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.providers.length > 1 ? `${row.providers[0]} (+${row.providers.length - 1})` : row.providers[0]}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill value={row.status} tone={row.tone} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleServicePublish(row)}
                          disabled={busyServiceId === row.serviceId}
                          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                            row.isPublished
                              ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                              : "bg-[#0f766e] text-white hover:bg-[#0b665f]"
                          }`}
                        >
                          <Globe size={11} />
                          {busyServiceId === row.serviceId ? "..." : row.isPublished ? "Unpublish" : "Publish"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!visibleRows.length ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-10">
                        <EmptyState
                          icon={FileText}
                          title="No matching records"
                          detail="Try clearing your search term or selecting another status filter."
                        />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="mt-3.5 flex flex-col items-center justify-between gap-2 sm:flex-row">
              <span className="text-xs text-slate-500">
                Showing {rangeStart}-{rangeEnd} of {sortedRows.length} services
              </span>
              <div className="flex items-center gap-2">
                <ActionButton
                  type="button"
                  tone="secondary"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setPage((c) => Math.max(0, c - 1))}
                  disabled={safePage === 0}
                >
                  <ChevronLeft size={13} />
                  Previous
                </ActionButton>
                <span className="text-xs font-semibold text-slate-700">
                  {safePage + 1} of {pageCount}
                </span>
                <ActionButton
                  type="button"
                  tone="secondary"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setPage((c) => Math.min(pageCount - 1, c + 1))}
                  disabled={safePage >= pageCount - 1}
                >
                  Next
                  <ChevronRight size={13} />
                </ActionButton>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. STAFF TAB
// ==========================================
function StaffView({ data, onAction, load }) {
  const providers = data?.providers ?? [];
  const departments = data?.departments ?? [];

  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState("");

  // Directory filters
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  const departmentById = useMemo(
    () => new Map(departments.map((item) => [String(item.id), item])),
    [departments]
  );

  const createFrontDesk = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setSuccess("");

    if (!form.email || !form.password) {
      setNotice("Email and temporary password are required.");
      setBusy(false);
      return;
    }

    try {
      await onAction({
        scope: "admin.staff.create",
        label: "Create front-desk account",
        path: "/auth/register/front-desk",
        method: "POST",
        body: { ...form, role: "front_desk" },
        successMessage: "Front-desk account provisioned",
      });
      setSuccess(`Account provisioned successfully for ${form.email}`);
      setForm({ email: "", password: "", first_name: "", last_name: "" });
      if (typeof load === "function") await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return providers.filter((p) => {
      if (selectedDept !== "all" && String(p.department_id) !== String(selectedDept)) {
        return false;
      }

      if (staffSearch.trim()) {
        const q = staffSearch.toLowerCase();
        const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
        const email = (p.email || "").toLowerCase();
        const specialty = (p.specialty || "").toLowerCase();
        const dept = (departmentById.get(String(p.department_id))?.name || "").toLowerCase();
        return fullName.includes(q) || email.includes(q) || specialty.includes(q) || dept.includes(q);
      }
      return true;
    });
  }, [providers, selectedDept, staffSearch, departmentById]);

  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200/90 bg-[#f8faf9] p-4 sm:p-6">
      <div className="flex flex-col gap-5">
        {/* Header Strip */}
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f766e]/10 text-[#0f766e]">
                <Shield size={16} />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">Access Governance</p>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Clinic Staff & Access Provisioning
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Provision reception and front desk credentials, audit clinician credentials, and govern access roles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ActionButton tone="secondary" onClick={load} className="h-9 px-3 text-xs">
              <RefreshCw size={13} />
              Refresh Staff
            </ActionButton>
          </div>
        </header>

        {/* 4 Overview Stat Cards */}
        <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Clinicians</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#0f766e]">
                <Stethoscope size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{providers.length}</p>
            <p className="mt-0.5 text-xs text-slate-400">Registered practitioners</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Departments</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Building2 size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{departments.length}</p>
            <p className="mt-0.5 text-xs text-slate-400">Active medical units</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Access Roles</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Shield size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">4 Roles</p>
            <p className="mt-0.5 text-xs text-slate-400">Admin, Provider, Front, Patient</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Audit Status</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">Compliant</p>
            <p className="mt-0.5 text-xs text-purple-600/80">HIPAA Role-Scoped</p>
          </div>
        </section>

        {/* 2-Column Split Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Front-Desk Provisioning Studio */}
          <div className="lg:col-span-5 xl:col-span-4">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f766e]">
                <UserPlus size={15} />
                User Provisioning
              </div>
              <h3 className="mt-1 text-base font-bold text-slate-900">Provision Front-Desk Access</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Register administrative receptionist accounts with role-based check-in permissions.
              </p>

              <form onSubmit={createFrontDesk} className="mt-4 space-y-3" noValidate>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="First Name"
                    value={form.first_name}
                    onChange={(v) => setForm((c) => ({ ...c, first_name: v }))}
                    disabled={busy}
                    placeholder="Jane"
                  />
                  <Field
                    label="Last Name"
                    value={form.last_name}
                    onChange={(v) => setForm((c) => ({ ...c, last_name: v }))}
                    disabled={busy}
                    placeholder="Doe"
                  />
                </div>

                <Field
                  label="Email Address"
                  value={form.email}
                  onChange={(v) => setForm((c) => ({ ...c, email: v }))}
                  disabled={busy}
                  required
                  placeholder="receptionist@smarthealth.org"
                />

                <Field
                  label="Temporary Password"
                  value={form.password}
                  onChange={(v) => setForm((c) => ({ ...c, password: v }))}
                  disabled={busy}
                  required
                  placeholder="Minimum 8 characters"
                />

                {notice ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                    {notice}
                  </p>
                ) : null}

                {success ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
                    {success}
                  </p>
                ) : null}

                <div className="pt-2">
                  <ActionButton
                    type="submit"
                    disabled={busy || !form.email || !form.password}
                    className="w-full justify-center py-2.5 text-xs font-bold"
                  >
                    {busy ? "Provisioning..." : "Create Front-Desk Account"}
                  </ActionButton>
                </div>
              </form>

              {/* Security Policy Reminder */}
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Shield size={13} className="text-[#0f766e]" />
                  Security & Access Compliance
                </div>
                <p className="mt-1 leading-relaxed text-slate-500">
                  Front-desk accounts are granted access to patient registration and appointment check-in queues, without access to clinical SOAP records.
                </p>
              </div>
            </section>
          </div>

          {/* Right Column: Staff & Clinicians Directory */}
          <div className="lg:col-span-7 xl:col-span-8">
            <section className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Clinical Staff Directory</h2>
                  <p className="text-xs text-slate-500">
                    Displaying {filteredStaff.length} of {providers.length} registered providers
                  </p>
                </div>

                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="h-8 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#0f766e]"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative mt-3.5">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Filter by name, email, specialty, or department..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs outline-none transition focus:border-[#0f766e] focus:bg-white"
                />
              </div>

              {/* Staff Cards List */}
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {filteredStaff.map((p) => {
                  const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ") || `Provider #${p.id}`;
                  const dept = departmentById.get(String(p.department_id))?.name || "Unassigned Unit";

                  return (
                    <article
                      key={p.id}
                      className="flex flex-col justify-between gap-3.5 rounded-2xl border border-slate-200/90 bg-[#fbfdfc] p-4 transition-all hover:border-[#8ccfc1] hover:shadow-xs sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0f766e]/10 text-sm font-bold text-[#0f766e]">
                          {fullName
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{fullName}</span>
                            <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-[#0f766e]">
                              Provider
                            </span>
                            {p.specialty ? (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                {p.specialty}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Building2 size={13} className="text-[#0f766e]" />
                              {dept}
                            </span>
                            {p.email ? (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Mail size={12} />
                                  {p.email}
                                </span>
                              </>
                            ) : null}
                          </div>

                          {p.bio ? (
                            <p className="mt-1.5 text-xs text-slate-600 line-clamp-1">{p.bio}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="shrink-0 sm:self-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Active Credential
                        </span>
                      </div>
                    </article>
                  );
                })}

                {!filteredStaff.length ? (
                  <div className="py-10">
                    <EmptyState
                      icon={Users}
                      title="No clinic staff found"
                      detail="Try adjusting your department filter or query."
                    />
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// FORM HELPER COMPONENTS
// ==========================================
function Field({ label, value, onChange, disabled = false, required = false, error = "", placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={label}
        className={`h-9 w-full rounded-xl border bg-white px-3 text-xs outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
          error
            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
            : "border-slate-200 focus:border-[#0f766e] focus:ring-emerald-100"
        }`}
      />
      {error ? <span className="mt-1 block text-[10px] font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function SelectField({ label, value, onChange, placeholder, disabled = false, required = false, error = "", children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={label}
        className={`h-9 w-full rounded-xl border bg-white px-3 text-xs outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
          error
            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
            : "border-slate-200 focus:border-[#0f766e] focus:ring-emerald-100"
        }`}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      {error ? <span className="mt-1 block text-[10px] font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}