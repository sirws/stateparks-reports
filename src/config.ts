/**
 * Application configuration.
 *
 * The OAuth application ID is read from the Vite environment variable
 * `VITE_ARCGIS_APP_ID` (see `.env.example`). The list of reports is a static
 * set of ArcGIS Online geoprocessing (web tool) service URLs. Each report's
 * input parameters are discovered dynamically from the service metadata.
 */

export interface ReportConfig {
  /** Stable key used in the UI. */
  id: string;
  /** Human-friendly label shown in the report selector. */
  label: string;
  /**
   * Full URL to the geoprocessing task endpoint (the task name is the last
   * path segment, e.g. `.../GPServer/Generate_Park_Report`).
   */
  url: string;
  /**
   * Optional overrides that populate a parameter's dropdown from a feature
   * layer query instead of the geoprocessing service metadata. Keyed by the
   * input parameter name.
   */
  parameterChoiceSources?: Record<string, ChoiceSource>;
}

/**
 * Describes how to populate a parameter's choice list by querying distinct
 * values from a feature layer field.
 */
export interface ChoiceSource {
  /** Feature layer (or table) REST URL to query. */
  layerUrl: string;
  /** Field whose distinct values become the choices. */
  field: string;
  /** Optional `orderByFields` clause, e.g. `"Park DESC"`. */
  orderByFields?: string;
}

/** The ArcGIS portal that issues OAuth tokens and hosts the web tools. */
export const PORTAL_URL = "https://www.arcgis.com";

/** OAuth application (client) ID. Provided via `.env`. */
export const APP_ID = import.meta.env.VITE_ARCGIS_APP_ID ?? "";

/** Static list of available reports. Add more entries as needed. */
export const REPORTS: ReportConfig[] = [
  {
    id: "generate-park-report",
    label: "Generate Park Report",
    url: "https://notebookswebtools5.arcgis.com/arcgis/rest/services/fddaf895af224382ac6ec14f34f8290b/GPServer/Generate_Park_Report",
    parameterChoiceSources: {
      park_name: {
        layerUrl:
          "https://services5.arcgis.com/4LKAHwqnBooVDUlX/arcgis/rest/services/FICAP_Current/FeatureServer/0",
        field: "Park",
        orderByFields: "Park ASC",
      },
    },
  },
  {
    id: "generate-building-report",
    label: "Generate Building Report",
    url: "https://notebookswebtools5.arcgis.com/arcgis/rest/services/6e024e6e7a354e7099ce091aca8d2f1c/GPServer/Generate_Building_Report",
  },
];
