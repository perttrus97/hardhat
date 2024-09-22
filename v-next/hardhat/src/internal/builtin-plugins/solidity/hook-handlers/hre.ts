import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";
import type {
  SolidityBuildSystem,
  BuildOptions,
  GetBuildInfoOptions,
  BuildInfo,
} from "../../../../types/solidity.js";
import type { SolidityBuildSystemOptions } from "../build-system/build-system.js";

class LazySolidityBuildSystem implements SolidityBuildSystem {
  readonly #options: SolidityBuildSystemOptions;

  #buildSystem: SolidityBuildSystem | undefined;

  constructor(options: SolidityBuildSystemOptions) {
    this.#options = options;
  }

  public async build(files: string[], options?: BuildOptions) {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.build(files, options);
  }

  public async getBuildInfos(files: string[], options?: GetBuildInfoOptions) {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.getBuildInfos(files, options);
  }

  public async compileBuildInfo(buildInfo: BuildInfo, force?: boolean) {
    const buildSystem = await this.#getBuildSystem();
    return buildSystem.compileBuildInfo(buildInfo, force);
  }

  async #getBuildSystem(): Promise<SolidityBuildSystem> {
    if (this.#buildSystem === undefined) {
      const { SolidityBuildSystemImplementation } = await import(
        "../build-system/build-system.js"
      );
      this.#buildSystem = new SolidityBuildSystemImplementation(this.#options);
    }

    return this.#buildSystem;
  }
}

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  return {
    created: async (_context, hre) => {
      hre.solidity = new LazySolidityBuildSystem({
        solidityConfig: hre.config.solidity,
        projectRoot: hre.config.paths.root,
        artifactsPath: hre.config.paths.artifacts,
        cachePath: hre.config.paths.cache,
      });
    },
  };
};
