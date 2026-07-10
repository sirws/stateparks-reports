/**
 * Submits a report as an asynchronous geoprocessing job, tracks its progress,
 * and resolves the downloadable result.
 */
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

  return {
    url: extractUrl(value),
    raw: value,
    parameterName: outputName,
  };
}
