/**
 * jsonSchemaToZod — converts a JSON Schema object to a Zod schema at runtime.
 * Used to turn Anthropic tool input_schema into validators we can assert on.
 */
import { z } from "zod";

export function jsonSchemaToZod(schema) {
  if (schema.enum) {
    return z.enum(schema.enum);
  }

  switch (schema.type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "integer":
      return z.number().int();
    case "boolean":
      return z.boolean();
    case "array": {
      if (schema.items) {
        return z.array(jsonSchemaToZod(schema.items));
      }
      return z.array(z.unknown());
    }
    case "object": {
      const shape = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          shape[key] = jsonSchemaToZod(prop);
        }
      }
      let obj = z.object(shape);
      if (schema.required) {
        obj = obj.required(
          Object.fromEntries(schema.required.map((k) => [k, true]))
        );
      }
      return obj;
    }
    default:
      return z.unknown();
  }
}
