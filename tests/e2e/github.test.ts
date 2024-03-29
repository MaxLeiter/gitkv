import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GithubProvider } from "@/providers/github";
import fs from "fs";
import path from "path";
import { createGithubBranch, removeGithubBranch } from "@/lib/github";

if (process.env.E2E === "true") {
  const githubConfig = {
    personalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN ?? "",
    repo: "git-db",
    owner: "maxleiter",
    branch: "test-branch",
  };

  const provider = new GithubProvider(githubConfig);
  const octokit = provider.getOctokit();

  // This could be any setup logic for your tests
  beforeAll(async () => {
    try {
      await createGithubBranch({
        branch: githubConfig.branch,
        owner: githubConfig.owner,
        repo: githubConfig.repo,
        octokit,
        rootBranch: "main",
      });
    } catch (e) {
      console.warn(e);
    }
  });

  afterAll(async () => {
    await removeGithubBranch({
      branch: githubConfig.branch,
      owner: githubConfig.owner,
      repo: githubConfig.repo,
      octokit,
    });
  });

  describe("GithubProvider Integration Test", () => {
    it("should commit changes to GitHub", async () => {
      provider.add(
        path.join(__dirname, "mockData", "testFile.json"),
        JSON.stringify({ test: "data" }),
      );
      const commit = provider.commit("Test commit");

      await provider.push();

      // Optionally verify the state post-push, this example just writes the commit to a file for mocking
      fs.writeFileSync(
        path.join(__dirname, "mockData", "testCommit.json"),
        JSON.stringify(commit, null, 2),
        "utf-8",
      );

      expect(commit).toHaveProperty("message", "Test commit");
    });

    it("supports pushing multiple commits", async () => {
      provider.add(
        path.join(__dirname, "mockData", "testFile.json"),
        JSON.stringify({ test: "data" }),
      );
      const commit1 = provider.commit("Test commit 2");

      fs.writeFileSync(
        path.join(__dirname, "mockData", "testCommit1.json"),
        JSON.stringify(commit1, null, 2),
        "utf-8",
      );

      provider.add(
        path.join(__dirname, "mockData", "testFile2.json"),
        JSON.stringify({ test: "data" }),
      );

      const commit2 = provider.commit("Test commit 3");

      await provider.push();

      fs.writeFileSync(
        path.join(__dirname, "mockData", "testCommit2.json"),
        JSON.stringify(commit2, null, 2),
        "utf-8",
      );
    });

    it("can fetch file paths", async () => {
      expect(
        await provider.get(path.join(__dirname, "mockData", "testFile.json")),
      ).toBe(JSON.stringify({ test: "data" }));
    });
  });
} else {
  it("E2E tests are disabled", () => {
    console.warn("E2E tests are disabled");
  });
}
