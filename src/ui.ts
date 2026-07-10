/**
 * Small helpers for rendering status, progress, errors, and results.
 */

/** Human-readable labels for ArcGIS job status codes. */
const STATUS_LABELS: Record<string, string> = {
  "job-submitted": "Submitted",
  "job-waiting": "Waiting",
  "job-executing": "Running the report…",
  "job-new": "Starting…",
  "job-succeeded": "Completed",
  "job-failed": "Failed",
  "job-cancelled": "Cancelled",
  "job-cancelling": "Cancelling…",
  "job-timed-out": "Timed out",
};

export function statusLabel(jobStatus: string): string {
  return STATUS_LABELS[jobStatus] ?? jobStatus;
}

export function showStatus(container: HTMLElement, message: string): void {
  container.className = "status status-info";
  container.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapeHtml(
    message
  )}`;
  container.hidden = false;
}

export function showError(container: HTMLElement, message: string): void {
  container.className = "status status-error";
  container.textContent = message;
  container.hidden = false;
}

export function showResultLink(
  container: HTMLElement,
  url: string,
  label = "Download report"
): void {
  container.className = "status status-success";
  container.innerHTML = "";
  const done = document.createElement("p");
  done.textContent = "Your report is ready.";
  const link = document.createElement("a");
  link.className = "download-button";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = label;
  container.appendChild(done);
  container.appendChild(link);
  container.hidden = false;
}

export function showRawResult(container: HTMLElement, raw: unknown): void {
  container.className = "status status-success";
  container.innerHTML = "<p>The report finished. Result:</p>";
  const pre = document.createElement("pre");
  pre.className = "result-raw";
  pre.textContent = JSON.stringify(raw, null, 2);
  container.appendChild(pre);
  container.hidden = false;
}

export function clearStatus(container: HTMLElement): void {
  container.hidden = true;
  container.innerHTML = "";
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
