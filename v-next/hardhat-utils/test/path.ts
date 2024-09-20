import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveFromRoot, shortenPath } from "../src/path.js";

describe("path", () => {
  describe("resolveFromRoot", () => {
    it("Should resolve an absolute path", () => {
      const root = "/root";
      const target = "/target";

      assert.equal(resolveFromRoot(root, target), target);
    });

    it("Should resolve a relative path", () => {
      const root = "/root";
      const target = "target";

      assert.equal(
        resolveFromRoot(root, target),
        path.resolve(path.join(root, target)),
      );
    });

    it("Should resolve a relative path with . and ..", () => {
      const root = "/root";
      const target = "./.././target";

      assert.equal(
        resolveFromRoot(root, target),
        path.resolve(path.join(root, target)),
      );
    });
  });

  describe("shortenPath", () => {
    it("Should shorten a path that's inside the folder", () => {
      assert.equal(
        shortenPath(
          "/home/user/project/contracts/File.sol",
          "/home/user/project",
        ),
        "contracts/File.sol",
      );

      assert.equal(
        shortenPath("/home/user/project/contracts/File.sol", "/home/user"),
        "project/contracts/File.sol",
      );

      assert.equal(
        shortenPath("/home/user/project/contracts/File.sol", "/home/user/"),
        "project/contracts/File.sol",
      );
    });

    it("Should not shorten a path that's not inside the folder", () => {
      assert.equal(
        shortenPath(
          "/home/user/project/contracts/File.sol",
          "/home/user/project2",
        ),
        "/home/user/project/contracts/File.sol",
      );
    });
  });
});
