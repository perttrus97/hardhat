import type { DependencyGraph } from "./dependency-graph.js";
import type { Resolver } from "./resolver/types.js";
import type { SolidityConfig } from "../../../../types/config.js";
import type {
  BuildInfo,
  BuildOptions,
  CompilationJobCreationError,
  FileBuildResult,
  GetBuildInfoOptions,
  SolcOutput,
  SolidityBuildSystem,
} from "../../../../types/solidity.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import debug from "debug";

import { DEFAULT_BUILD_PROFILE } from "../build-profiles.js";

import { downloadConfiguredCompilers } from "./compiler/index.js";
import { buildDependencyGraph } from "./dependency-graph-building.js";
import { formatRemapping } from "./resolver/remappings.js";

const log = debug("hardhat:core:solidity:build-system");

export interface SolidityBuildSystemOptions {
  readonly solidityConfig: SolidityConfig;
  readonly projectRoot: string;
  readonly artifactsPath: string;
  readonly cachePath: string;
}

export class SolidityBuildSystemImplementation implements SolidityBuildSystem {
  readonly #options: SolidityBuildSystemOptions;

  constructor(options: SolidityBuildSystemOptions) {
    this.#options = options;
  }

  public async build(
    rootFiles: string[],
    options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>> {
    await this.#downloadConfiguredCompilers();

    const { dependencyGraph, resolver } = await buildDependencyGraph(
      rootFiles,
      this.#options.projectRoot,
      this.#options.solidityConfig.remappings,
    );

    printDependencyGraphAndRemappingsSummary(dependencyGraph, resolver);

    const buildProfileName = options?.buildProfile ?? DEFAULT_BUILD_PROFILE;

    log(`Using build profile ${buildProfileName}`);

    for (const [rootFile, resolvedFile] of dependencyGraph.getRoots()) {
      log(
        `Building compilation job for root file ${rootFile} with source name ${resolvedFile.sourceName}`,
      );

      const subgraph = dependencyGraph.getSubgraph(rootFile);

      printDependencyGraphAndRemappingsSummary(subgraph, resolver);

      // TODO: Try to find a compiler configuration for this subgraph, using
      // the build profile. If we can't we fail, returning
      // CompilationJobCreationErrror
    }

    if (options?.mergeCompilationJobs === true) {
      log(`Merging compilation jobs`);

      // TODO: merge compilation jobs
    }

    // TODO: Crate the solc input for each compilation job
    // TODO: Compile them in parallel

    // TODO: If all of them succeed, emit their artifacts, and return the map
    // of results

    // TODO: If any of them fail, return the map of results, but do not emit
    // any artifacts

    return new Map();
  }

  public async getBuildInfos(
    _rootFiles: string[],
    _options?: GetBuildInfoOptions,
  ): Promise<CompilationJobCreationError | Map<string, BuildInfo>> {
    // TODO: Can we use this internally in `build`? The main difference is the
    // presence of a cache.
    assertHardhatInvariant(false, "Method not implemented.");
  }

  public async compileBuildInfo(
    _buildInfo: BuildInfo,
    _force?: boolean,
  ): Promise<SolcOutput> {
    assertHardhatInvariant(false, "Method not implemented.");
  }

  async #downloadConfiguredCompilers(): Promise<void> {
    const solcVersionsToUse = new Set(
      Object.values(this.#options.solidityConfig.profiles)
        .map((profile) => [
          ...profile.compilers.map((compiler) => compiler.version),
          ...Object.values(profile.overrides).map(
            (override) => override.version,
          ),
        ])
        .flat(1),
    );

    await downloadConfiguredCompilers(solcVersionsToUse);
  }
}

function printDependencyGraphAndRemappingsSummary(
  dependencyGraph: DependencyGraph,
  resolver: Resolver,
): void {
  const roots = dependencyGraph.getRoots();
  const rootFiles = new Set(roots.values());
  const allFiles = dependencyGraph.getAllFiles();

  const rootRepresentations: string[] = [];

  for (const [rootFile, resolvedFile] of roots.entries()) {
    if (rootFile.startsWith("npm:")) {
      rootRepresentations.push(`- ${rootFile} -> ${resolvedFile.sourceName}
      ${resolvedFile.fsPath}`);
    } else {
      rootRepresentations.push(`- ${resolvedFile.sourceName}
      ${resolvedFile.fsPath}`);
    }
  }

  console.log(`Printing dependency graph and remappings summary`);

  console.log(`
Roots:
  ${rootRepresentations.join("\n  ")}
`);

  const otherFiles = [...allFiles].filter((file) => !rootFiles.has(file));

  if (otherFiles.length > 0) {
    console.log(`
Other files:
  ${otherFiles
    .map((file) => `- ` + file.sourceName + `\n      ` + file.fsPath)
    .join("\n  ")}
`);
  }

  const files = [...[...rootFiles].toSorted(), ...[...otherFiles].toSorted()];
  const dependencies: string[] = [];

  for (const file of files) {
    const dependenciesForFile = [...dependencyGraph.getDependencies(file)]
      .map((d) => d.sourceName)
      .sort();

    for (const dependency of dependenciesForFile) {
      dependencies.push(`- ${file.sourceName} -> ${dependency}`);
    }
  }

  if (dependencies.length > 0) {
    console.log(`
Dependencies:
  ${dependencies.join("\n  ")}
`);
  }

  const remappings = resolver.getRemappings();

  if (remappings.length > 0) {
    console.log(`
Remappings:
  ${remappings.map((r) => `- ${formatRemapping(r)}`).join("\n  ")}
`);

    console.log("\n\n");
  }
}
