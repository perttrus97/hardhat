import type { Cursor } from "@nomicfoundation/slang/cursor/index.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import BitSet from "@marsraptor/bitset";
import { NonterminalKind } from "@nomicfoundation/slang/kinds/index.js";
import { Language } from "@nomicfoundation/slang/language/index.js";
import { Query } from "@nomicfoundation/slang/query/index.js";

const importQuery =
    `(
       [PathImport @path path: [_]]
     | [NamedImport @path path: [_]]
     | [ImportDeconstruction @path path: [_]]
     )`;

const pragmaQuery =
    `[VersionPragma [VersionExpressionSets (@versionExpression [VersionExpression])+]]`;

const queries = [importQuery, pragmaQuery].map(Query.parse);

const supportedVersions = Language.supportedVersions();
const mostRecentVersion = supportedVersions[supportedVersions.length - 1];
const language = new Language(mostRecentVersion);

const unvisitedSourceNames = new Array<string>();
interface Source {
    dependencies: Set<string>;
    compatibleVersions: BitSet.default;
}
const graph = new Map<string, Source>();

{
    let sourceName;
    while ((sourceName = unvisitedSourceNames.pop()) !== undefined) {
        const source = graph.get(sourceName);
        assertHardhatInvariant(source !== undefined, "We have already added this source to the graph");

        const contents = ""; // TODO: read the file (failure is a fatal error)
        const output = language.parse(NonterminalKind.SourceUnit, contents);
        const cursor = output.createTreeCursor();
        const matches = cursor.query(queries);

        let match;
        while ((match = matches.next()) !== null) {
            if (match.queryNumber === 0) {
                const imprt = match.captures.path[0].node.toString();
                // TODO: ensure imprt is a direct import
                // TODO: resolve imprt according to the context and remappings
                source.dependencies.add(imprt);
                ensureImportIsProcessed(imprt);
            } else {
                // VersionExpressionSets are the disjunction of VersionExpressions
                const bitset = match.captures.versionExpression.map(bitsetFromVersionExpression).reduce((a, b) => a.or(b));
                source.compatibleVersions = source.compatibleVersions.and(bitset);
            }
        }
    }
}

function ensureImportIsProcessed(imprt: string) {
    if (!graph.has(imprt)) {
        graph.set(imprt, { dependencies: new Set(), compatibleVersions: new BitSet.default(supportedVersions.length).flip() });
        unvisitedSourceNames.push(imprt);
    }
}

function bitsetFromVersionExpression(_expr: Cursor) {
    // TODO: implement
    return new BitSet.default();
};

interface Root {
    dependencies: Set<string>;
    bestVersion?: string;
}
const roots = new Map<string, Root>();

function _addRoot(rootSourceName: string) {
    const dependencies = new Set<string>();
    const compatibleVersions = new BitSet.default(supportedVersions.length).flip();

    const visit = (sourceName: string) => {
        const source = graph.get(sourceName);
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

    let bestVersion;
    for (let i = supportedVersions.length - 1; i >= 0; i--) {
        if (compatibleVersions.get(i) === 1) {
            // - TODO: select a compatible version from the allowed versions (failure is a fatal error)
            bestVersion = supportedVersions[i];
            break;
        }
    }

    roots.set(rootSourceName, { dependencies, bestVersion });
}
