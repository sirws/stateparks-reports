/**
 * Application entry point. Wires together authentication, report selection,
 * the dynamic parameter form, and asynchronous job execution.
 */
import "./styles/brand.css";
import { getCurrentUser, initAuth, signIn, signOut } from "./auth";
import { APP_ID, REPORTS } from "./config";
import { applyValues, readFormValues, renderForm } from "./form";
import { runReport } from "./job";
import { loadReportSchema, type ReportSchema } from "./reports";
import {
  clearStatus,
  showError,
  showRawResult,
  showResultLink,
  showStatus,
  statusLabel,
} from "./ui";

const app = document.querySelector<HTMLDivElement>("#app")!;

/** Query-string key that selects which report to load. */
const REPORT_PARAM = "report";

/**
 * Reads the current URL query string. Returns the requested report id (if any)
 * and the remaining entries, which are treated as report parameter values.
 */
function readUrlParams(): {
  reportId: string | null;
  values: Record<string, string>;
} {
  const search = new URLSearchParams(window.location.search);
  const reportId = search.get(REPORT_PARAM);
  const values: Record<string, string> = {};

  for (const [key, value] of search.entries()) {
    if (key !== REPORT_PARAM) {
      values[key] = value;
    }
  }

  return { reportId, values };
}

function shell(bodyHtml: string, userName?: string): string {
  const userSection = userName
    ? `<span class="user-name">${userName}</span>
       <button id="sign-out" class="link-button" type="button">Sign out</button>`
    : "";
  return `
    <header class="site-header">
      <div class="site-header-inner">
        <div class="brand">
          <img
            class="brand-logo"
            src="https://parks.wa.gov/sites/default/files/WAStateParks_Logo.png"
            alt="Washington State Parks logo"
          />
          <div class="brand-text">
            <span class="brand-title">Washington State Parks</span>
            <span class="brand-subtitle">Report Generator</span>
          </div>
        </div>
        <div class="header-actions">${userSection}</div>
      </div>
    </header>
    <main class="site-main">${bodyHtml}</main>
    <footer class="site-footer">
      <p>&copy; ${new Date().getFullYear()} Washington State Parks and Recreation Commission</p>
    </footer>
  `;
}

function renderConfigError(): void {
  app.innerHTML = shell(`
    <section class="card">
      <h1>Configuration required</h1>
      <p>
        No ArcGIS application ID is configured. Create a <code>.env</code> file
        (see <code>.env.example</code>) with your <code>VITE_ARCGIS_APP_ID</code>
        and restart the dev server.
      </p>
    </section>
  `);
}

function renderSignIn(): void {
  app.innerHTML = shell(`
    <section class="card card-centered">
      <h1>Sign in</h1>
      <p>Sign in with your ArcGIS account to generate park reports.</p>
      <button id="sign-in" class="primary-button" type="button">
        Sign in with ArcGIS
      </button>
    </section>
  `);

  document
    .querySelector<HTMLButtonElement>("#sign-in")!
    .addEventListener("click", () => {
      void signIn();
    });
}

function renderApp(userName: string): void {
  const options = REPORTS.map(
    (r) => `<option value="${r.id}">${r.label}</option>`
  ).join("");

  app.innerHTML = shell(
    `
    <section class="card">
      <h1>Generate a report</h1>

      <div class="field">
        <label for="report-select">Report</label>
        <select id="report-select">
          <option value="">Select a report…</option>
          ${options}
        </select>
      </div>

      <p id="report-description" class="report-description" hidden></p>

      <form id="report-form" novalidate></form>

      <div class="actions">
        <button id="run-button" class="primary-button" type="button" disabled>
          Generate report
        </button>
      </div>

      <div id="status" class="status" role="status" aria-live="polite" hidden></div>
    </section>
  `,
    userName
  );

  document
    .querySelector<HTMLButtonElement>("#sign-out")!
    .addEventListener("click", signOut);

  wireReportWorkflow();
}

function wireReportWorkflow(): void {
  const select = document.querySelector<HTMLSelectElement>("#report-select")!;
  const description = document.querySelector<HTMLParagraphElement>(
    "#report-description"
  )!;
  const form = document.querySelector<HTMLFormElement>("#report-form")!;
  const runButton = document.querySelector<HTMLButtonElement>("#run-button")!;
  const status = document.querySelector<HTMLDivElement>("#status")!;

  let currentSchema: ReportSchema | null = null;

  /**
   * Loads the schema for the currently selected report, renders its form, and
   * optionally pre-fills field values (e.g. from the URL). Returns true on
   * success.
   */
  async function loadSelectedReport(
    prefill?: Record<string, string>
  ): Promise<boolean> {
    clearStatus(status);
    form.innerHTML = "";
    description.hidden = true;
    runButton.disabled = true;
    currentSchema = null;

    const report = REPORTS.find((r) => r.id === select.value);
    if (!report) {
      return false;
    }

    showStatus(status, "Loading report parameters…");
    try {
      const schema = await loadReportSchema(report);
      currentSchema = schema;
      description.textContent = schema.description;
      description.hidden = !schema.description;
      renderForm(schema, form);
      if (prefill) {
        applyValues(form, prefill);
      }
      runButton.disabled = false;
      clearStatus(status);
      return true;
    } catch (err) {
      showError(status, `Could not load report parameters: ${errorText(err)}`);
      return false;
    }
  }

  select.addEventListener("change", () => {
    void loadSelectedReport();
  });

  runButton.addEventListener("click", async () => {
    if (!currentSchema) {
      return;
    }
    if (!form.reportValidity()) {
      return;
    }

    const params = readFormValues(form);
    runButton.disabled = true;
    select.disabled = true;
    showStatus(status, "Submitting report…");

    try {
      const result = await runReport(currentSchema, params, (jobStatus) => {
        showStatus(status, statusLabel(jobStatus));
      });

      if (result.url) {
        showResultLink(status, result.url);
      } else {
        showRawResult(status, result.raw);
      }
    } catch (err) {
      showError(status, `Report failed: ${errorText(err)}`);
    } finally {
      runButton.disabled = false;
      select.disabled = false;
    }
  });

  // Apply URL parameters: auto-select the report and pre-fill its values so the
  // user can simply click "Generate report".
  const { reportId, values } = readUrlParams();
  if (reportId && REPORTS.some((r) => r.id === reportId)) {
    select.value = reportId;
    void loadSelectedReport(values);
  }
}

function errorText(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

async function bootstrap(): Promise<void> {
  if (!APP_ID) {
    renderConfigError();
    return;
  }

  initAuth();

  try {
    const user = await getCurrentUser();
    if (user) {
      renderApp(user.fullName);
    } else {
      renderSignIn();
    }
  } catch {
    renderSignIn();
  }
}

void bootstrap();
