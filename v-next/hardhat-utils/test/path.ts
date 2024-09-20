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
        shortenPath(import.meta.filename, import.meta.dirname),
        path.basename(import.meta.filename),
      );

      assert.equal(
        shortenPath(import.meta.filename, path.dirname(import.meta.dirname)),
        path.join(
          path.basename(import.meta.dirname),
          path.basename(import.meta.filename),
        ),
      );

      // Test that it works with a path.sep at the end
      assert.equal(
        shortenPath(
          import.meta.filename,
          path.dirname(import.meta.dirname) + path.sep,
        ),
        path.join(
          path.basename(import.meta.dirname),
          path.basename(import.meta.filename),
        ),
      );
    });

    it("Should not shorten a path that's not inside the folder", () => {
      assert.equal(
        shortenPath(import.meta.filename, import.meta.dirname + "nope"),
        import.meta.filename,
      );
    });
  });
});
