import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import spec from "../openapi.yaml";

// OpenAPI 3.1 schemas are JSON Schema 2020-12, so Ajv can check them directly
// once the spec is registered as a schema its component $refs resolve against.
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(spec, "openapi");

const cache = new Map<string, ValidateFunction>();

/** A validator for the response schema the spec gives `path` → 200 JSON. */
function validatorFor(path: string): ValidateFunction {
  let validate = cache.get(path);
  if (!validate) {
    const pointer = `openapi#/paths/${path.replaceAll("~", "~0").replaceAll("/", "~1")}/get/responses/200/content/application~1json/schema`;
    validate = ajv.compile({ $ref: pointer });
    cache.set(path, validate);
  }
  return validate;
}

/** Throws a readable error when `body` doesn't match the spec for `path`. */
export function assertMatchesSpec(path: string, body: unknown): void {
  const validate = validatorFor(path);
  if (!validate(body)) {
    throw new Error(
      `response for ${path} doesn't match openapi.yaml:\n${ajv.errorsText(validate.errors, { separator: "\n" })}`,
    );
  }
}
