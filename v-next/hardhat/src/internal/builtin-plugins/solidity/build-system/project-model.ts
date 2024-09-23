import type { Cursor } from "@nomicfoundation/slang/cursor/index.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import BitSet from "@marsraptor/bitset";
import {
  NonterminalKind,
  TerminalKind,
} from "@nomicfoundation/slang/kinds/index.js";
import { Language } from "@nomicfoundation/slang/language/index.js";
import { Query } from "@nomicfoundation/slang/query/index.js";
import {
  NodeType,
  NonterminalNode,
  TerminalNode,
} from "@nomicfoundation/slang/cst/index.js";
import { cursor } from "@nomicfoundation/slang/napi-bindings/generated/index.js";
import { Comparator, Range } from "semver";

export type SourceName = string;
export type VersionNumber = string;

const availableVersions = Language.supportedVersions();
const language = new Language(availableVersions[availableVersions.length - 1]);

const pathImportQuery = Query.parse("[PathImport @path path: [_]]");
const namedImportQuery = Query.parse("[NamedImport @path path: [_]]");
const importDeconstructionQuery = Query.parse(
  "[ImportDeconstruction @path path: [_]]",
);
const versionPragmaQuery = Query.parse(
  "[VersionPragma [VersionExpressionSets [VersionExpressionSet (@versionExpression [VersionExpression])+]]]",
);

export class ProjectDefinition {
  constructor(
    readonly roots: SourceName[],
    readonly allowableVersions: VersionNumber[] = availableVersions, // ... but if this is lazy then we can't use it in the constructor
  ) {}
}

export interface Root {
  dependencies: Set<SourceName>;
  // undefined if we couldn't determine the best version
  bestVersion?: VersionNumber;
}

interface Source {
  dependencies: Set<SourceName>;
  dependents: Set<SourceName>;
  compatibleVersions: BitSet.default;
}

export abstract class ProjectModel {
  definition: ProjectDefinition;

  readonly #roots = new Map<SourceName, Root>();
  readonly #sources = new Map<SourceName, Source>();

  constructor(definition: ProjectDefinition) {
    this.definition = definition;
  }

  public updateDefinition(definition: ProjectDefinition): void {
    this.definition = definition;
    // TODO: do minimum invalidation
    this.#roots.clear();
    this.#sources.clear();
  }

  public sourceDidChange(sourceName: SourceName): void {
    // TODO: do minimum invalidation
    this.#roots.clear();
    this.#sources.clear();
  }

  public async getRoot(rootSourceName: SourceName): Promise<Root> {
    if (!this.#roots.has(rootSourceName)) {
      const unvisitedSourceNames = new Array<string>();

      const ensureSourceNameIsProcessed = (sourceName: SourceName) => {
        if (!this.#sources.has(sourceName)) {
          this.#sources.set(sourceName, {
            dependencies: new Set(),
            dependents: new Set(),
            compatibleVersions: new BitSet.default().flip(),
          });
          unvisitedSourceNames.push(sourceName);
        }
      };

      {
        // Add the root and it's dependencies to the graph of sources

        ensureSourceNameIsProcessed(rootSourceName);

        let sourceName;
        while ((sourceName = unvisitedSourceNames.pop()) !== undefined) {
          const source = this.#sources.get(sourceName);
          assertHardhatInvariant(
            source !== undefined,
            "We have already added this source to the graph",
          );

          const contents = await this.getSourceContent(sourceName);
          const parseOutput = language.parse(
            NonterminalKind.SourceUnit,
            contents,
          );
          const matches = parseOutput
            .createTreeCursor()
            .query([
              pathImportQuery,
              namedImportQuery,
              importDeconstructionQuery,
              versionPragmaQuery,
            ]);

          let match;
          while ((match = matches.next()) !== null) {
            if (match.queryNumber < 3) {
              const importSourceName = await this.resolveImport(
                sourceName,
                match.captures.path[0].node.toString(),
              );
              // TODO: what if the import doesn't exist?
              source.dependencies.add(importSourceName);
              ensureSourceNameIsProcessed(importSourceName);
            } else {
              // VersionExpressionSets are the disjunction of VersionExpression(s)

              // Filter out any parse errors
              const compatibleVersions = match.captures.versionExpression.map(
                (expr) => this.bitsetFromVersionExpression(expr),
              );

              // No point adding a constraint that was nothing but parse errors
              if (compatibleVersions.length !== 0) {
                source.compatibleVersions = source.compatibleVersions.and(
                  compatibleVersions.reduce((a, b) => a.or(b)),
                );
              }
            }
          }
        }
      }

      {
        // Compute the transitive dependencies and version constraints of the root

        const dependencies = new Set<string>();
        let compatibleVersions = new BitSet.default(
          availableVersions.length,
        ).flip();

        const visit = (sourceName: SourceName) => {
          const source = this.#sources.get(sourceName);
          assertHardhatInvariant(
            source !== undefined,
            "We have already added this source to the graph",
          );
          compatibleVersions = source.compatibleVersions;
          for (const dependency of source.dependencies) {
            if (!dependencies.has(dependency)) {
              dependencies.add(dependency);
              visit(dependency);
            }
            compatibleVersions = compatibleVersions.and(
              source.compatibleVersions,
            );
          }
        };

        visit(rootSourceName);

        // Determine the best version from the allowable versions that satisfies the transitive constraints

        let bestVersion;
        for (let i = availableVersions.length - 1; i >= 0; i--) {
          if (compatibleVersions.get(i) === 1) {
            const candidateVersion = availableVersions[i];
            if (this.definition.allowableVersions.includes(candidateVersion)) {
              bestVersion = candidateVersion;
              break;
            }
          }
        }

        // if bestVersion is undefined, it means the versions constraints are unsatisfiable

        this.#roots.set(rootSourceName, { dependencies, bestVersion });
      }
    }

    const root = this.#roots.get(rootSourceName);
    assertHardhatInvariant(
      root !== undefined,
      "We have already added this root to the set of roots",
    );
    return root;
  }

  bitsetFromVersionExpression(expr: Cursor): BitSet.default {
    const node = expr.node();
    assertHardhatInvariant(
      node instanceof NonterminalNode,
      "The query can only return a nonterminal node",
    );
    const exprAsString = node.unparse();
    console.log(exprAsString);
    const range = new Range(exprAsString);
    const bitset = new BitSet.default(availableVersions.length);
    for (let i = availableVersions.length - 1; i >= 0; i--) {
      if (range.test(availableVersions[i])) {
        bitset.set(i);
      }
    }
    return bitset;
  }

  abstract getSourceContent(_sourceName: SourceName): Promise<string>;
  abstract resolveImport(
    _context: SourceName,
    _importPath: string,
  ): Promise<SourceName>;
}
