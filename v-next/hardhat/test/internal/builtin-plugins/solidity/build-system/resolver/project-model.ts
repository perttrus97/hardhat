import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ProjectDefinition,
  ProjectModel,
  SourceName,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/project-model.js";

const TEST_FIXTURES_ROOT = path.resolve(import.meta.dirname, "test-fixtures");

const FIXTURE_HARDHAT_PROJECT_ROOT = path.resolve(
  TEST_FIXTURES_ROOT,
  "entirely-local",
);

class TestProjectModel extends ProjectModel {
  override getSourceContent(sourceName: string): Promise<string> {
    return readFile(
      path.join(FIXTURE_HARDHAT_PROJECT_ROOT, sourceName),
      "utf-8",
    );
  }

  override resolveImport(
    context: string,
    importPath: string,
  ): Promise<SourceName> {
    throw new Error(
      `Method not implemented, context: ${context}, importPath: ${importPath}`,
    );
  }
}

describe("Project Model", () => {
  describe("Version constraints", () => {
    it("Should read the version constraints from the files", async () => {
      const projectDefinition = new ProjectDefinition(["A.sol"]);
      const projectModel = new TestProjectModel(projectDefinition);

      const root = await projectModel.getRoot("A.sol");
      assert.equal(root.dependencies.size, 0);
      assert.equal(root.bestVersion, [0, 8, 20]);
    });
  });
});
