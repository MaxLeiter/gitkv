import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { GithubProvider } from "./github";
import { GitKVError } from "../lib/git-db-error";
import {
  getLatestCommit,
  createBlobs,
  createNewTree,
  createNewCommit,
  updateBranchRef,
  getFileContent,
  openPullRequest,
  createGithubBranch,
} from "@/lib/github";

vi.mock("@/lib/github", () => ({
  getLatestCommit: vi.fn(),
  createBlobs: vi.fn(),
  createNewTree: vi.fn(),
  createNewCommit: vi.fn(),
  updateBranchRef: vi.fn(),
  getFileContent: vi.fn(),
  openPullRequest: vi.fn(),
  createGithubBranch: vi.fn(),
}));

describe("GithubProvider", () => {
  let provider: GithubProvider;
  const config = {
    personalAccessToken: "token",
    repo: "test-repo",
    owner: "test-owner",
  };

  beforeEach(() => {
    provider = new GithubProvider(config);
  });

  describe("set", () => {
    it("should add changes, commit, and push", async () => {
      (getLatestCommit as Mock).mockResolvedValue([
        { sha: "latestCommitSha", treeSha: "baseTreeSha" },
      ]);
      (createBlobs as Mock).mockResolvedValue([{ data: { sha: "blobSha" } }]);
      (createNewTree as Mock).mockResolvedValue({
        data: { sha: "newTreeSha" },
      });
      (createNewCommit as Mock).mockResolvedValue({
        data: { sha: "newCommitSha" },
      });

      const addSpy = vi.spyOn(provider, "add");
      const commitSpy = vi.spyOn(provider, "commit");
      const pushSpy = vi.spyOn(provider, "push");

      await provider.set("path", "data", "message");
      expect(addSpy).toHaveBeenCalledWith("path", "data");
      expect(commitSpy).toHaveBeenCalledWith("message");
      expect(pushSpy).toHaveBeenCalled();
    });
  });

  describe("add", () => {
    it("should stage changes", () => {
      provider.add("path", "data");
      // @ts-expect-error - private properties
      expect(provider.stagedChanges).toEqual([{ path: "path", data: "data" }]);
    });
  });

  describe("commit", () => {
    it("should create a commit with staged changes", () => {
      provider.add("path", "data");
      const commit = provider.commit("message");
      expect(commit).toEqual({
        message: "message",
        changes: [{ path: "path", data: "data" }],
        timestamp: expect.any(Number),
      });
      // @ts-expect-error - private properties
      expect(provider.stagedCommits).toEqual([commit]);
      // @ts-expect-error - private properties
      expect(provider.stagedChanges).toEqual([]);
    });

    it("should throw an error if no changes are staged", () => {
      expect(() => provider.commit("message")).toThrowError(GitKVError);
    });
  });

  describe("push", () => {
    it("should push staged commits", async () => {
      // @ts-expect-error - private properties
      provider.stagedCommits = [
        {
          message: "message",
          changes: [{ path: "path", data: "data" }],
          timestamp: Date.now(),
        },
      ];

      (createGithubBranch as Mock).mockResolvedValue(undefined);
      (getLatestCommit as Mock).mockResolvedValue([
        { sha: "latestCommitSha", treeSha: "baseTreeSha" },
      ]);
      (createBlobs as Mock).mockResolvedValue([{ data: { sha: "blobSha" } }]);
      (createNewTree as Mock).mockResolvedValue({
        data: { sha: "newTreeSha" },
      });
      (createNewCommit as Mock).mockResolvedValue({
        data: { sha: "newCommitSha" },
      });
      (updateBranchRef as Mock).mockResolvedValue(undefined);

      const count = await provider.push();

      expect(count).toBe(1);
      //   @ts-expect-error - private properties
      expect(provider.stagedCommits).toEqual([]);
    });

    it("should throw an error if push fails", async () => {
      (createGithubBranch as Mock).mockRejectedValue(
        new Error("Failed to create branch"),
      );

      await expect(provider.push()).rejects.toThrowError(GitKVError);
    });
  });

  describe("get", () => {
    it("should get file content", async () => {
      (getFileContent as Mock).mockResolvedValue("file content");

      const content = await provider.get("path");

      expect(content).toBe("file content");
    });

    it("should throw an error if get fails", async () => {
      (getFileContent as Mock).mockRejectedValue(
        new Error("Failed to get file"),
      );

      await expect(provider.get("path")).rejects.toThrowError(GitKVError);
    });
  });

  describe("openPullRequest", () => {
    it("should open a pull request", async () => {
      (openPullRequest as Mock).mockResolvedValue("pull request url");

      const url = await provider.openPullRequest("title", "body", "base");

      expect(url).toBe("pull request url");
    });
  });
});
