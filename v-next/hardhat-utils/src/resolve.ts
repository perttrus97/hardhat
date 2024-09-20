import { createRequire } from "node:module";

/**
 * The different errors that can be found when resolving a module.
 */
export enum ResolutionError {
  /**
   * The node resolution failed to find the module and/or package.
   */
  MODULE_NOT_FOUND = "MODULE_NOT_FOUND",

  /**
   * The node resolution found the package, but it uses package.json#exports
   * and doesn't export the requested module.
   */
  NOT_EXPORTED = "NOT_EXPORTED",
}

/**
 * The of trying to resolve a module.
 */
export type ResolutionResult =
  | { success: true; absolutePath: string }
  | { success: false; error: ResolutionError };

/**
 * Resolves the module identifier into an absolute path, following the Node.js
 * resolution algorithm, starting the resolution from the given `from` path.
 */
export function resolve(
  moduleIdentifierToResolve: string,
  from: string,
): ResolutionResult {
  const require = createRequire(import.meta.url);

  try {
    return {
      success: true,
      absolutePath: require.resolve(moduleIdentifierToResolve, {
        paths: [from],
      }),
    };
  } catch (e) {
    // ensure that this is MODULE_NOT_FOUND
    if (typeof e === "object" && e !== null && "code" in e) {
      if (e.code === "MODULE_NOT_FOUND") {
        return { success: false, error: ResolutionError.MODULE_NOT_FOUND };
      }

      if (e.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        return { success: false, error: ResolutionError.NOT_EXPORTED };
      }
    }

    /* c8 ignore next 2 */
    throw e;
  }
}
