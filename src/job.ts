/**
 * Submits a report as an asynchronous geoprocessing job, tracks its progress,
 * and resolves the downloadable result.
 */
import IdentityManager from "@arcgis/core/identity/IdentityManager.js";
import * as geoprocessor from "@arcgis/core/rest/geoprocessor.js";
import type { ReportSchema } from "./reports";

export type JobStatusCallback = (status: string) => void;

export interface ReportResult {
  /** URL to the generated report file, when the output exposes one. */
  url: string | null;
  /** The raw output value, for outputs that are not files. */
  raw: unknown;
  /** The output parameter name this result came from. */
  parameterName: string;
}

/** Attempts to extract a downloadable URL from an arbitrary GP output value. */
function extractUrl(value: unknown): string | null {
  if (typeof value === "string") {
    return /^https?:\/\//i.test(value) ? value : null;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string") {
      return obj.url;
    }
  }
  return null;
}

/**
 * Appends the current ArcGIS token to a result URL so the file can be
 * downloaded directly by the browser. The web-tools server returns a 499
 * ("token required") error when the link is opened without one.
 */
async function appendToken(url: string): Promise<string> {
  try {
    const credential = await IdentityManager.getCredential(url, {
      error: null,
    });
    if (credential?.token) {
      const withToken = new URL(url);
      withToken.searchParams.set("token", credential.token);
      return withToken.toString();
    }
  } catch {
    // Fall through and return the original URL if no token is available.
  }
  return url;
}

/**
 * Runs the report and returns its result. `onStatus` is invoked with the job
 * status each time it changes while polling.
 */
export async function runReport(
  schema: ReportSchema,
  params: Record<string, unknown>,
  onStatus: JobStatusCallback
): Promise<ReportResult> {
  const jobInfo = await geoprocessor.submitJob(schema.config.url, params);

  await jobInfo.waitForJobCompletion({
    interval: 1500,
    statusCallback: (info) => onStatus(info.jobStatus),
  });

  // Prefer the first declared output parameter; fall back to "output".
  const outputName = schema.outputNames[0] ?? "output";
  const result = await jobInfo.fetchResultData(outputName);
  const value = (result as { value?: unknown }).value ?? result;

  const rawUrl = extractUrl(value);
  const url = rawUrl ? await appendToken(rawUrl) : null;

  return {
    url,
    raw: value,
    parameterName: outputName,
  };
}
