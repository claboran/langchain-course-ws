import SwaggerParser from '@apidevtools/swagger-parser';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateOpenAPISpec(spec: any): Promise<ValidationResult> {
  try {
    // Validate and dereference the spec
    await SwaggerParser.validate(spec);

    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  } catch (error: any) {
    // Parse validation errors
    const errors: string[] = [];

    if (error.message) {
      errors.push(error.message);
    }

    if (error.details) {
      errors.push(...error.details.map((d: any) => d.message || String(d)));
    }

    return {
      valid: false,
      errors,
      warnings: [],
    };
  }
}

export async function dereferenceSpec(spec: any): Promise<any> {
  try {
    return await SwaggerParser.dereference(spec);
  } catch (error: any) {
    throw new Error(`Failed to dereference spec: ${error.message}`);
  }
}
