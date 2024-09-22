import type { ResolvedFile } from "./resolver/types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

export class DependencyGraph {
  readonly #roots = new Set<ResolvedFile>();
  readonly #publicSourceNameToRoot = new Map<string, ResolvedFile>();
  readonly #dependencies = new Map<ResolvedFile, Set<ResolvedFile>>();

  /**
   * Adds a root file to the graph.
   *
   * @param publicSourceName The source name used to identify the file, as it
   * would appear in the artifacts and used by the user. This is not always the
   * same as the source name used by solc, as it differs when an npm file is
   * acting as a root.
   * @param root The root file.
   */
  public addRootFile(publicSourceName: string, root: ResolvedFile): void {
    this.#roots.add(root);
    this.#publicSourceNameToRoot.set(publicSourceName, root);
  }

  public addDependency(from: ResolvedFile, to: ResolvedFile): void {
    let dependencies = this.#dependencies.get(from);

    if (dependencies === undefined) {
      dependencies = new Set();
      this.#dependencies.set(from, dependencies);
    }

    dependencies.add(to);

    if (!this.#dependencies.has(to)) {
      this.#dependencies.set(to, new Set());
    }
  }

  public getRoots(): ReadonlyMap<string, ResolvedFile> {
    return this.#publicSourceNameToRoot;
  }

  public getAllFiles(): Set<ResolvedFile> {
    return new Set(this.#dependencies.keys());
  }

  public hasFile(file: ResolvedFile): boolean {
    return this.#dependencies.has(file);
  }

  public getDependencies(file: ResolvedFile): Set<ResolvedFile> {
    return this.#dependencies.get(file) ?? new Set();
  }

  public getSubgraph(...rootPublicSourceNames: string[]): DependencyGraph {
    const subgraph = new DependencyGraph();

    const filesToTraverse: ResolvedFile[] = [];

    for (const rootPublicSourceName of rootPublicSourceNames) {
      const root = this.#publicSourceNameToRoot.get(rootPublicSourceName);

      assertHardhatInvariant(
        root !== undefined,
        "We should have a root for every root public source name",
      );

      subgraph.addRootFile(rootPublicSourceName, root);
      filesToTraverse.push(root);
    }

    let fileToAnalyze;
    while ((fileToAnalyze = filesToTraverse.pop()) !== undefined) {
      for (const dependency of this.getDependencies(fileToAnalyze)) {
        if (!subgraph.hasFile(dependency)) {
          filesToTraverse.push(dependency);
        }

        subgraph.addDependency(fileToAnalyze, dependency);
      }
    }

    return subgraph;
  }

  public merge(other: DependencyGraph): DependencyGraph {
    const merged = new DependencyGraph();

    for (const [publicSourceName, root] of this.#publicSourceNameToRoot) {
      merged.addRootFile(publicSourceName, root);
    }

    for (const [publicSourceName, root] of other.#publicSourceNameToRoot) {
      merged.addRootFile(publicSourceName, root);
    }

    for (const [from, toes] of this.#dependencies) {
      for (const to of toes) {
        merged.addDependency(from, to);
      }
    }

    for (const [from, toes] of other.#dependencies) {
      for (const to of toes) {
        merged.addDependency(from, to);
      }
    }

    return merged;
  }
}
