import type { Remapping } from "./types.js";
import type { Cursor } from "@nomicfoundation/slang/cursor/index.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import BitSet from "@marsraptor/bitset";
import { NonterminalKind } from "@nomicfoundation/slang/kinds/index.js";
import { Language } from "@nomicfoundation/slang/language/index.js";
import { Query } from "@nomicfoundation/slang/query/index.js";

// Maybe this should all be in the Project instance, to avoid startup cost?
const supportedVersions = Language.supportedVersions();
const mostRecentVersion = supportedVersions[supportedVersions.length - 1];
const language = new Language(mostRecentVersion);

const importQuery =
    `(
       [PathImport @path path: [_]]
     | [NamedImport @path path: [_]]
     | [ImportDeconstruction @path path: [_]]
     )`;

const pragmaQuery =
    `[VersionPragma [VersionExpressionSets (@versionExpression [VersionExpression])+]]`;

const queries = [importQuery, pragmaQuery].map(Query.parse);

type SourceName = string;
type Version = string; // actually, no - find something better, from semver most likely

interface Source {
    dependencies: Set<SourceName>;
    compatibleVersions: BitSet.default;
}

export interface Root {
    dependencies: Set<SourceName>;
    bestVersion?: Version;
}

export class Project {

    readonly #allowableVersions: Version[]; // sorted in descending order
    readonly #remappings: Remapping[];

    readonly #sources = new Map<SourceName, Source>();
    readonly #roots = new Map<SourceName, Root>();

    constructor(allowableVersions: Version[], remappings: Remapping[]) {
        this.#allowableVersions = allowableVersions;
        this.#remappings = remappings;
    }

    public createRoot(rootSourceName: SourceName): Root {
        // maybe this should mark the root as changed if we already have it?
        // in which case we need to be able to remove a root as well, and
        // trigger a rebuild if a non-root source changes.

        if (!this.#roots.has(rootSourceName)) {

            const unvisitedSourceNames = new Array<string>();

            const ensureSourceNameIsProcessed = (sourceName: SourceName) => {
                if (!this.#sources.has(sourceName)) {
                    this.#sources.set(sourceName, { dependencies: new Set(), compatibleVersions: new BitSet.default().flip() });
                    unvisitedSourceNames.push(sourceName);
                }
            }


            {
                // Add the root and it's dependencies to the graph of sources

                ensureSourceNameIsProcessed(rootSourceName);

                let sourceName;
                while ((sourceName = unvisitedSourceNames.pop()) !== undefined) {
                    const source = this.#sources.get(sourceName);
                    assertHardhatInvariant(source !== undefined, "We have already added this source to the graph");

                    const contents = this.#getSourceContent(sourceName);
                    const parseOutput = language.parse(NonterminalKind.SourceUnit, contents);
                    const matches = parseOutput.createTreeCursor().query(queries);

                    let match;
                    while ((match = matches.next()) !== null) {
                        if (match.queryNumber === 0) {
                            const importSourceName = this.#resolveImport(sourceName, match.captures.path[0].node.toString());
                            // TODO: what if the import doesn't exist?
                            source.dependencies.add(importSourceName);
                            ensureSourceNameIsProcessed(importSourceName);
                        } else {
                            // VersionExpressionSets are the disjunction of VersionExpressions
                            const compatibleVersions = match.captures.versionExpression.map(bitsetFromVersionExpression).reduce((a, b) => a.or(b));
                            source.compatibleVersions = source.compatibleVersions.and(compatibleVersions);
                        }
                    }
                }
            }

            {
                // Compute the transitive dependencies and version constraints of the root

                const dependencies = new Set<string>();
                const compatibleVersions = new BitSet.default(supportedVersions.length).flip();

                const visit = (sourceName: SourceName) => {
                    const source = this.#sources.get(sourceName);
                    assertHardhatInvariant(source !== undefined, "We have already added this source to the graph");
                    for (const dependency of source.dependencies) {
                        if (!dependencies.has(dependency)) {
                            dependencies.add(dependency);
                            visit(dependency);
                        }
                        compatibleVersions.and(source.compatibleVersions);
                    }
                }

                visit(rootSourceName);

                // Determine the best version from the allowable versions that satisfies the transitive constraints

                let bestVersion;
                for (let i = supportedVersions.length - 1; i >= 0; i--) {
                    if (compatibleVersions.get(i) === 1) {
                        const candidateVersion = supportedVersions[i];
                        if (this.#allowableVersions.includes(candidateVersion)) {
                            bestVersion = candidateVersion
                            break;
                        }
                    }
                }

                // if bestVersion is undefined, the versions constraints are unsatisfiable

                this.#roots.set(rootSourceName, { dependencies, bestVersion });
            }
        }

        const root = this.#roots.get(rootSourceName);
        assertHardhatInvariant(root !== undefined, "We have already added this root to the set of roots");
        return root;
    }

    // This should be abstract
    #getSourceContent(_sourceName: SourceName): string {
        // TODO: read the file (failure is a fatal error)
        return "";
    }

    // This should be abstract
    #resolveImport(_context: SourceName, _importPath: string): SourceName {
        // TODO: convert a relative import to a direct import
        // TODO: resolve the import according to the context and this.#remappings (Pato's code)
        return "";
    }

}

function bitsetFromVersionExpression(_expr: Cursor) {
    // TODO: implement this
    return new BitSet.default();
};