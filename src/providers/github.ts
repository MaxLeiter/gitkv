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
import { GitKVError } from "../lib/git-db-error";
import { Octokit } from "@octokit/core";
import type { Change, Commit, IKVDBProvider } from "@/types";

interface GithubConfig {
  personalAccessToken: string;
  repo: string;
  branch?: string;
  owner: string;
}

export class GithubProvider implements IKVDBProvider {
  private readonly config: GithubConfig;
  private readonly octokit: Octokit;
  private stagedChanges: Change[] = [];
  private stagedCommits: Commit[] = [];

  constructor(config: GithubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
    });
  }

  async set(path: string, data: string, message: string): Promise<Commit> {
    this.add(path, data);
    const commit = this.commit(message);
    await this.push();
    return commit;
  }

  add(path: string, data: string): void {
    this.stagedChanges.push({
      path,
      data,
    });
  }

  commit(message: string): Commit {
    if (this.stagedChanges.length === 0) {
      throw new GitKVError("No changes to commit");
    }

    const commit: Commit = {
      message,
      changes: [...this.stagedChanges],
      timestamp: Date.now(),
    };

    this.stagedCommits.push(commit);
    this.stagedChanges = [];

    return commit;
  }

  async push(): Promise<number> {
    const { owner, repo, branch = "main" } = this.config;
    // create branch if it doesn't exist
    try {
      await createGithubBranch({
        branch,
        owner,
        repo,
        octokit: this.octokit,
      });
    } catch (e) {
      if (!e.message?.startsWith("Reference already exists")) {
        throw new GitKVError(`Failed to create branch: ${e.message}`);
      }
    }

    try {
      for (const commit of this.stagedCommits) {
        const [{ sha: latestCommitSha, treeSha: baseTreeSha }, blobs] =
          await Promise.all([
            getLatestCommit(this.octokit, owner, repo, branch),
            createBlobs(this.octokit, owner, repo, commit.changes),
          ]);

        const { data: newTree } = await createNewTree(
          this.octokit,
          owner,
          repo,
          baseTreeSha,
          commit.changes,
          blobs,
        );

        const { data: newCommit } = await createNewCommit(
          this.octokit,
          owner,
          repo,
          commit.message,
          newTree.sha,
          latestCommitSha,
        );

        await updateBranchRef(this.octokit, owner, repo, branch, newCommit.sha);
      }
    } catch (e) {
      throw new GitKVError(`Failed to push: ${e.message}`, e.stack);
    }

    const stagedCommitsCount = this.stagedCommits.length;
    this.stagedCommits = [];

    return stagedCommitsCount;
  }

  async get(path: string): Promise<string> {
    const { owner, repo, branch = "main" } = this.config;
    try {
      return await getFileContent(this.octokit, owner, repo, path, branch);
    } catch (e) {
      throw new GitKVError(`Failed to get file: ${e.message}`);
    }
  }

  /** GitHub specific: open a pull request if it doesn't exist yet */
  async openPullRequest(
    title: string,
    body: string,
    base: string,
  ): Promise<string> {
    try {
      return await openPullRequest({
        octokit: this.octokit,
        base,
        head: this.config.branch ?? "main",
        owner: this.config.owner,
        repo: this.config.repo,
        title,
        body,
      });
    } catch (e) {
      if (e.message?.includes("A pull request already exists")) {
        // TODO: type/improve
        return "";
      }

      throw new GitKVError(`Failed to open pull request: ${e.message}`);
    }
  }

  changeBranch(branch: string): void {
    this.config.branch = branch;
  }

  getOctokit(): Octokit {
    return this.octokit;
  }
}
