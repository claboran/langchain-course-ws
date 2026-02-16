/**
 * Singleton store for managing OpenAPI specifications in memory
 */
export class SpecsStore {
  private static instance: SpecsStore;
  private specs: Map<string, any>;

  private constructor() {
    this.specs = new Map();
  }

  static getInstance(): SpecsStore {
    if (!SpecsStore.instance) {
      SpecsStore.instance = new SpecsStore();
    }
    return SpecsStore.instance;
  }

  set(id: string, spec: any): void {
    this.specs.set(id, spec);
  }

  get(id: string): any | undefined {
    return this.specs.get(id);
  }

  has(id: string): boolean {
    return this.specs.has(id);
  }

  delete(id: string): boolean {
    return this.specs.delete(id);
  }

  list(): Array<{ id: string; spec: any }> {
    return Array.from(this.specs.entries()).map(([id, spec]) => ({
      id,
      spec,
    }));
  }

  clear(): void {
    this.specs.clear();
  }

  getMetadata(id: string): { title: string; description: string; version: string } | undefined {
    const spec = this.get(id);
    if (!spec?.info) return undefined;

    return {
      title: spec.info.title || 'Untitled API',
      description: spec.info.description || '',
      version: spec.info.version || '1.0.0',
    };
  }
}
