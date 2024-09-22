/**
 * The representation of an npm package.
 */
export interface ResolvedNpmPackage {
  /**
   * The name of the package, potentially scopde.
   */
  name: string;

  /**
   * The version of the package.
   */
  version: string;

  /**
   * The path to the package's root directory.
   */
  rootFsPath: string;

  /**
   * The prefix that represents the source name of the package's files.
   *
   * For example, package 'foo' with version '1.2.3' would have a root source
   * name of 'npm/foo@1.2.3/'. If the package is part of the monorepo, the root
   * source name would be 'npm/package@local/'.
   *
   * Note that this can be derived from the rest of the fields, but it's
   * cached here for performance reasons.
   */
  rootSourceName: string;
}

/**
 * The possible types of resolved files.
 */
export enum ResolvedFileType {
  PROJECT_FILE = "PROJECT_FILE",
  NPM_PACKGE_FILE = "NPM_PACKAGE_FILE",
}

/**
 * A file that's part of the Hardhat project (i.e. not installed through npm).
 */
export interface ProjectResolvedFile {
  type: ResolvedFileType.PROJECT_FILE;
  /**
   * The source name of a project files is its relative path from the Hardhat
   * project root.
   */
  sourceName: string;

  /**
   * The absolute path to the file.
   */
  fsPath: string;

  /**
   * The file contents.
   */
  content: string;
}

/**
 * A file that's part of an npm package.
 */
export interface NpmPackageResolvedFile {
  type: ResolvedFileType.NPM_PACKGE_FILE;

  /**
   * The source of an npm package file is `npm/<package-name>@<version>/<path>`.
   */
  sourceName: string;

  /**
   * The absolute path to the file.
   */
  fsPath: string;

  /**
   * The file contents.
   */
  content: string;

  /**
   * The package this file belongs to.
   */
  package: ResolvedNpmPackage;
}

/**
 * The resolult of resolving a file or import using a Resolver.
 */
export type ResolvedFile = ProjectResolvedFile | NpmPackageResolvedFile;

/**
 * A solc remapping.
 */
export interface Remapping {
  context: string;
  prefix: string;
  target: string;
}

/**
 * A Resolver is a stateful object that can be used to to construct a dependency
 * graph, by resolving both the local project and npm files, and their imports.
 *
 * As part of the resolution process, it generates the list of remappings that
 * are needed to build the project.
 *
 * This resolver uses `sourceName`s to identify the resolved files, which are
 * not necessarily related to the file path.
 *
 * The `sourceName` of a Hardhat project file is its relative path from the
 * project root. For example, if the project root is `/home/user/project`, and
 * there are files `/home/user/project/contracts/File.sol` and
 * `home/user/project/File2.sol`, their source names are `contracts/File.sol`
 * and `File2.sol`.
 *
 * The `sourceName` of an npm file is `npm/<package-name>@<version>/<path>`.
 * This is constructed by using the Node.js resolution algorithm, to resolve
 * an npm file or import, and using the package's `package.json` file to
 * determine the source name. For example, if we import `foo/bar.sol`, its
 * source name could be `npm/foo@1.2.3/bar.sol`.
 *
 * If the Node.js resolution algorithm resolve a file into a package that's
 * part of the monorepo where the Hardhat project is (i.e. it's not part of a
 * `node_modules` directory), the source name is going to be
 * `npm/package@local/path/to/file`.
 *
 * Note that in the Node.js ecosystem, a package manager may install multiple
 * instances of the same package and version (i.e. fail to deduplicate them).
 * In those cases the Resolver will use the first instance it finds, and will
 * always resolve to that one.
 *
 * Finally, the current version of the resolver doesn't support npm packages
 * that use `pacakge.json#exports`.
 */
export interface Resolver {
  /**
   * Resolve a Hardhat project file.
   *
   * @param absoluteFilePath The absolute path to the file.
   * @returns The resolved file.
   */
  resolveProjectFile(absoluteFilePath: string): Promise<ProjectResolvedFile>;

  /**
   * Resolves an npm package file, which must be a dependency available in the
   * Hardhat project.
   *
   * This method is only meant to be used when an npm file needs to be rebuilt
   * to emit its artifacts, because the user requested it through their config.
   *
   * @param npmModule The npm module to resolve, in the form of
   * `<package-name>/<file-path>`.
   * @returns The resolved file.
   */
  resolveNpmDependencyFile(npmModule: string): Promise<NpmPackageResolvedFile>;

  /**
   * Resolves an import.
   *
   * @param from The file where the import statement is located.
   * @param importPath The import path, as written in the source code. For
   * example, if the import statement is `import "./foo.sol";`, the import
   * path is `./foo.sol`.
   * @returns The imported file.
   */
  resolveImport(from: ResolvedFile, importPath: string): Promise<ResolvedFile>;

  /**
   * Returns the list of remappings needed to build the project.
   *
   * TODO: Does this include all the user remappings? Only the necessary ones?
   * What if we are only compiling parts of the dependency graph of it?
   */
  getRemappings(): Remapping[];
}
