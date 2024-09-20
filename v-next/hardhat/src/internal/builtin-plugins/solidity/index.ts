import type { HardhatPlugin } from "../../../types/plugins.js";

import { globalOption, task } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:solidity",
  hookHandlers: {
    config: import.meta.resolve("./hook-handlers/config.js"),
    hre: import.meta.resolve("./hook-handlers/hre.js"),
  },
  tasks: [
    task("compile", "Compiles the entire project")
      .addFlag({
        name: "force",
        description: "Force compilation even if no files have changed",
      })
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
  globalOptions: [
    globalOption({
      name: "buildProfile",
      description: "The build profile to use",
      defaultValue: "default",
    }),
  ],
};

export default hardhatPlugin;
