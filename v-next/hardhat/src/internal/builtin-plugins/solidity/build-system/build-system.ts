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
import { readUtf8File } from "@ignored/hardhat-vnext-utils/fs";

import { DEFAULT_BUILD_PROFILE } from "../build-profiles.js";

import {
  downloadConfiguredCompilers as downloadCompilers,
  getCompiler,
} from "./compiler/index.js";

export interface SolidityBuildSystemOptions {
  readonly solidityConfig: SolidityConfig;
  readonly projectRoot: string;
  readonly artifactsPath: string;
  readonly cachePath: string;
  readonly sourcesPaths: string[];
}

export class SolidityBuildSystemImplementation implements SolidityBuildSystem {
  readonly #options: SolidityBuildSystemOptions;

  constructor(options: SolidityBuildSystemOptions) {
    this.#options = options;
  }

  public async build(
    files: string[],
    options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>> {
    console.log("build", files, options);

    await this.#downloadConfiguredCompilers();

    const buildProfile =
      this.#options.solidityConfig.profiles[
        options?.buildProfile ?? DEFAULT_BUILD_PROFILE
      ];

    for (const file of files) {
      const compilerConfig = buildProfile.compilers[0];
      const versionToUse = compilerConfig.version;

      console.log(`Compiling file ${file} with version ${versionToUse}`);

      const compiler = await getCompiler(versionToUse);

      const compilerInput = {
        language: "Solidity",
        sources: {
          [file]: {
            content: await readUtf8File(file),
          },
        },
        settings: {
          outputSelection: {
            "*": {
              "*": [
                "abi",
                "evm.bytecode",
                "evm.deployedBytecode",
                "evm.methodIdentifiers",
                "metadata",
              ],
              "": ["ast"],
            },
          },
        },
      };

      const output = await compiler.compile(compilerInput);

      console.log(output);
    }

    return {};
  }

  public async getBuildInfos(
    _files: string[],
    _options?: GetBuildInfoOptions,
  ): Promise<CompilationJobCreationError | Map<string, BuildInfo>> {
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

    await downloadCompilers(solcVersionsToUse);
  }
}
