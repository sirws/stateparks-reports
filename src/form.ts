/**
 * Builds an HTML form from a report's input parameters and reads the entered
 * values back into a plain object suitable for a geoprocessing job.
 */
import type { GpParameter, ReportSchema } from "./reports";

/** Maps a geoprocessing data type to an HTML input type. */
function inputTypeFor(dataType: string): string {
  switch (dataType) {
    case "GPLong":
    case "GPDouble":
      return "number";
    case "GPDate":
      return "date";
    default:
      return "text";
  }
}

/**
 * Renders the parameter form into `container`. Returns nothing; use
 * {@link readFormValues} to collect the values on submit.
 */
export function renderForm(schema: ReportSchema, container: HTMLElement): void {
  container.innerHTML = "";

  if (schema.inputs.length === 0) {
    const note = document.createElement("p");
    note.className = "form-note";
    note.textContent = "This report has no parameters.";
    container.appendChild(note);
    return;
  }

  for (const param of schema.inputs) {
    container.appendChild(buildField(param));
  }
}

function buildField(param: GpParameter): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const fieldId = `param-${param.name}`;
  const label = document.createElement("label");
  label.htmlFor = fieldId;
  label.textContent = param.displayName;
  if (param.required) {
    const req = document.createElement("span");
    req.className = "required";
    req.textContent = " *";
    label.appendChild(req);
  }
  wrapper.appendChild(label);

  let control: HTMLInputElement | HTMLSelectElement;

  if (param.choiceList && param.choiceList.length > 0) {
    const select = document.createElement("select");
    for (const choice of param.choiceList) {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice;
      if (choice === String(param.defaultValue ?? "")) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    control = select;
  } else if (param.dataType === "GPBoolean") {
    const select = document.createElement("select");
    for (const choice of ["true", "false"]) {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice;
      if (choice === String(param.defaultValue ?? "false")) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    control = select;
  } else {
    const input = document.createElement("input");
    input.type = inputTypeFor(param.dataType);
    if (param.defaultValue != null) {
      input.value = String(param.defaultValue);
    }
    control = input;
  }

  control.id = fieldId;
  control.name = param.name;
  control.dataset.dataType = param.dataType;
  if (param.required) {
    control.required = true;
  }
  wrapper.appendChild(control);

  if (param.description && param.description !== param.displayName) {
    const help = document.createElement("p");
    help.className = "field-help";
    help.textContent = param.description;
    wrapper.appendChild(help);
  }

  return wrapper;
}

/** Converts a raw string value into the type expected by the GP task. */
function coerce(value: string, dataType: string): unknown {
  switch (dataType) {
    case "GPLong":
      return value === "" ? null : parseInt(value, 10);
    case "GPDouble":
      return value === "" ? null : parseFloat(value);
    case "GPBoolean":
      return value === "true";
    default:
      return value;
  }
}

/**
 * Reads the current form values keyed by parameter name, coercing each to the
 * appropriate JavaScript type.
 */
export function readFormValues(
  container: HTMLElement
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const controls = container.querySelectorAll<
    HTMLInputElement | HTMLSelectElement
  >("[name]");

  controls.forEach((control) => {
    const dataType = control.dataset.dataType ?? "GPString";
    values[control.name] = coerce(control.value, dataType);
  });

  return values;
}

/**
 * Sets form control values from a map of parameter name to string value.
 * Unknown parameter names are ignored. Returns the names that were applied.
 */
export function applyValues(
  container: HTMLElement,
  values: Record<string, string>
): string[] {
  const applied: string[] = [];

  for (const [name, value] of Object.entries(values)) {
    const control = container.querySelector<
      HTMLInputElement | HTMLSelectElement
    >(`[name="${CSS.escape(name)}"]`);
    if (control) {
      control.value = value;
      applied.push(name);
    }
  }

  return applied;
}
