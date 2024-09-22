import type { ResolvedFile, Resolver } from "./resolver/types.js";

import { DependencyGraph } from "./dependency-graph.js";
import { ResolverImplementation } from "./resolver/dependency-resolver.js";

export async function buildDependencyGraph(
  rootFiles: string[],
  projectRoot: string,
  userRemappings: string[],
): Promise<{
  dependencyGraph: DependencyGraph;
  resolver: Resolver;
}> {
  const resolver = await ResolverImplementation.create(
    projectRoot,
    userRemappings,
  );

  const dependencyGraph = new DependencyGraph();

  const filesToProcess: ResolvedFile[] = [];

  for (const file of rootFiles) {
    let resolvedFile;

    if (file.startsWith("npm:")) {
      const npmModule = file.substring(4);
      resolvedFile = await resolver.resolveNpmDependencyFile(npmModule);
      dependencyGraph.addRootFile(npmModule, resolvedFile);
    } else {
      resolvedFile = await resolver.resolveProjectFile(file);
      dependencyGraph.addRootFile(resolvedFile.sourceName, resolvedFile);
    }

    filesToProcess.push(resolvedFile);
  }

  let fileToProcess;
  while ((fileToProcess = filesToProcess.pop()) !== undefined) {
    for (const importPath of fileToProcess.content.importPaths) {
      const importedFile = await resolver.resolveImport(
        fileToProcess,
        importPath,
      );

      if (!dependencyGraph.hasFile(importedFile)) {
        filesToProcess.push(importedFile);
      }

      dependencyGraph.addDependency(fileToProcess, importedFile);
    }
  }

  return { dependencyGraph, resolver };
}
