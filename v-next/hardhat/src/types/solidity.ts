export interface BuildInfo {
  // TODO
  todo: never;
}

export interface SolcOutput {
  // TODO
  todo: never;
}

/**
 * The options of the `build` method.
 */
export interface BuildOptions {
  /**
   * If `true`, it forces rebuilding every file, ignoring the compilation cache.
   */
  force?: boolean;

  /**
   * The build profile to use.
   *
   * Default: "default".
   */
  buildProfile?: string;

  /**
   * If `true`, this option allows the build process to merge compilation jobs
   * if they have the same compiler version and settings.
   *
   * This is an useful optimization to be used when compiling a large number of
   * files, but keep in mind that it can lead to unrelated files being compiled
   * together, block explorer verification processes trickier and/or with
   * unexpected results.
   */
  mergeCompilationJobs?: boolean;

  /**
   * The number of concurrent compilation jobs to run.
   *
   * Default: The number of CPU cores - 1.
   */
  concurrency?: number;

  /**
   * An array of remappings provided by the user.
   */
  userProvidedRemappings?: string[];
}

/**
 * The options of the `getBuildInfos` method.
 */
export type GetBuildInfoOptions = Omit<BuildOptions, "force">;

export type CompilationJobCreationError = {} | {};

/**
 * The restult of building a file.
 */
export enum FileBuildResultType {
  CACHE_HIT = "CACHE_HIT",
  BUILD_SUCCESS = "BUILD_SUCCESS",
  BUILD_FAILURE = "BUILD_FAILURE",
}

export type FileBuildResult =
  | CacheHitFileBuildResult
  | SuccessfulFileBuildResult
  | FailedFileBuildResult;

export interface CacheHitFileBuildResult {
  type: FileBuildResultType.CACHE_HIT;
  // TODO: Should we remove this? It is a buildId of an already existing build
  // info.
  buildId: string;
}

export interface SuccessfulFileBuildResult {
  type: FileBuildResultType.BUILD_FAILURE;
  buildId: string;
  contractArtifactsGenerated: string[];
}

export interface FailedFileBuildResult {
  type: FileBuildResultType.BUILD_FAILURE;
  buildId: string;
  errors: any[]; // TODO: This can't be verbatim from `solc` as we have to
  // inverse-remap everything to be understandable by the user.
}

/**
 * The Solidity build system.
 */
export interface SolidityBuildSystem {
  /**
   * Builds the provided files, generating their compilation artifacts.
   *
   * @param files The files to build, which can be either absolute paths or
   * `npm:<package-name>/<file-path>` URIs.
   * @param options The options to use when building the files.
   * @returns An `Map` of the files to their build results, or an error if
   * there was a problem when trying to create the necessary compilation jobs.
   */
  build(
    files: string[],
    options?: BuildOptions,
  ): Promise<CompilationJobCreationError | Map<string, FileBuildResult>>;

  /**
   * Returns the BuildInfos that would be used to build the provided files.
   *
   * @param files The files to analyze, which can be either absolute paths or
   * `npm:<package-name>/<file-path>` URIs.
   * @param options The options to use when analyzing the files.
   * @returns A `Map` of the files to their build infos, or an error if there
   * was a problem when trying to create the necessary compilation jobs.
   */
  getBuildInfos(
    files: string[],
    options?: GetBuildInfoOptions,
  ): Promise<CompilationJobCreationError | Map<string, BuildInfo>>;

  /**
   * Compiles a build info, returning the output of the compilation, verbatim,
   * as `solc` returns it.
   *
   * @param buildInfo The build info to compile.
   * @param force If `true`, this indicates that this compilation should be
   * re-done even if the BuildInfo already has a solc output.
   * @returns The output of the compilation.
   */
  compileBuildInfo(buildInfo: BuildInfo, force?: boolean): Promise<SolcOutput>;
}
