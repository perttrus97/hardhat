import type { NewTaskActionFunction } from "../../../../types/tasks.js";

import { getAllFilesMatching } from "@ignored/hardhat-vnext-utils/fs";

import { shouldMergeCompilationJobs } from "../build-profiles.js";

interface CompileActionArguments {
  force: boolean;
}

const compileAction: NewTaskActionFunction<CompileActionArguments> = async (
  { force },
  { config, solidity, globalOptions },
) => {
  const localFilesToCompile = (
    await Promise.all(
      config.paths.sources.solidity.map((dir) =>
        getAllFilesMatching(dir, (f) => f.endsWith(".sol")),
      ),
    )
  ).flat(1);

  const results = await solidity.build(localFilesToCompile, {
    force,
    buildProfile: globalOptions.buildProfile,
    mergeCompilationJobs: shouldMergeCompilationJobs(
      globalOptions.buildProfile,
    ),
  });

  console.log({ results });
};

export default compileAction;
