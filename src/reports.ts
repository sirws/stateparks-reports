/**
 * Fetches and parses geoprocessing (web tool) service metadata so the report
 * form can be generated dynamically from the service's input parameters.
 */
import esriRequest from "@arcgis/core/request.js";
import * as query from "@arcgis/core/rest/query.js";
import Query from "@arcgis/core/rest/support/Query.js";
import type { ChoiceSource, ReportConfig } from "./config";

/** A single input parameter of a geoprocessing task. */
export interface GpParameter {
  name: string;
  displayName: string;
  description: string;
  /** e.g. `GPString`, `GPLong`, `GPDouble`, `GPBoolean`, `GPDate`. */
  dataType: string;
  required: boolean;
  defaultValue: unknown;
  /** When present, the parameter is restricted to this set of values. */
  choiceList?: string[];
}

/** Parsed metadata describing how to run and read a report. */
export interface ReportSchema {
  config: ReportConfig;
  displayName: string;
  description: string;
  /** True when the service must be run via submitJob (asynchronous). */
  asynchronous: boolean;
  inputs: GpParameter[];
  /** Names of output parameters (used to fetch the result). */
  outputNames: string[];
}

interface RawGpParameter {
  name: string;
  displayName?: string;
  description?: string;
  parameterType?: string;
  defaultValue?: unknown;
  dataType?: string;
  direction?: string;
  choiceList?: string[];
}

interface RawGpService {
  displayName?: string;
  name?: string;
  description?: string;
  executionType?: string;
  parameters?: RawGpParameter[];
}

/**
 * Requests the JSON description of a geoprocessing task and normalizes it into
 * a {@link ReportSchema}. The request is authenticated automatically by the
 * IdentityManager once the user is signed in.
 */
export async function loadReportSchema(
  config: ReportConfig
): Promise<ReportSchema> {
  const response = await esriRequest(config.url, {
    query: { f: "json" },
    responseType: "json",
  });

  const data = response.data as RawGpService;
  const parameters = data.parameters ?? [];

  const inputs: GpParameter[] = parameters
    .filter((p) => p.direction === "esriGPParameterDirectionInput")
    .map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description ?? "",
      dataType: p.dataType ?? "GPString",
      required: p.parameterType === "esriGPParameterTypeRequired",
      defaultValue: p.defaultValue,
      choiceList: p.choiceList,
    }));

  const outputNames = parameters
    .filter((p) => p.direction === "esriGPParameterDirectionOutput")
    .map((p) => p.name);

  // Populate any parameter choice lists sourced from a feature layer query.
  await applyChoiceSources(inputs, config.parameterChoiceSources);

  return {
    config,
    displayName: data.displayName || data.name || config.label,
    description: data.description ?? "",
    asynchronous: data.executionType === "esriExecutionTypeAsynchronous",
    inputs,
    outputNames,
  };
}

/**
 * For each configured choice source, queries the feature layer for distinct
 * field values and assigns them to the matching input parameter's choice list.
 */
async function applyChoiceSources(
  inputs: GpParameter[],
  sources?: Record<string, ChoiceSource>
): Promise<void> {
  if (!sources) {
    return;
  }

  await Promise.all(
    Object.entries(sources).map(async ([paramName, source]) => {
      const param = inputs.find((p) => p.name === paramName);
      if (!param) {
        return;
      }
      param.choiceList = await queryDistinctValues(source);
    })
  );
}

/** Returns the distinct, non-empty values of a field from a feature layer. */
async function queryDistinctValues(source: ChoiceSource): Promise<string[]> {
  const q = new Query({
    where: "1=1",
    outFields: [source.field],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: source.orderByFields ? [source.orderByFields] : undefined,
  });

  const result = await query.executeQueryJSON(source.layerUrl, q);

  return result.features
    .map((f) => f.attributes[source.field])
    .filter((v): v is string | number => v != null && v !== "")
    .map((v) => String(v));
}
