import { GitDBError } from "../lib/git-db-error";
import { Octokit } from "@octokit/core";

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

  async save(path: string, data: string, message: string): Promise<Commit> {
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
      throw new GitDBError("No changes to commit");
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
    // eslint-disable-next-line no-useless-catch
    try {
      const { owner, repo, branch = "main" } = this.config;

      for (const commit of this.stagedCommits) {
        // 1. Get the latest commit of the branch
        const { data: refData } = await this.octokit.request(
          "GET /repos/{owner}/{repo}/git/ref/heads/{branch}",
          {
            owner,
            repo,
            branch,
          },
        );
        const latestCommitSha = refData.object.sha;

        // 2. Create blobs for each change
        const blobsPromises = commit.changes.map(
          async (change) =>
            await this.octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
              owner,
              repo,
              content: change.data ?? "",
              encoding: "utf-8",
            }),
        );
        const blobs = await Promise.all(blobsPromises);

        // 3. Get the tree of the latest commit to append our changes
        const { data: latestCommit } = await this.octokit.request(
          "GET /repos/{owner}/{repo}/git/commits/{commit_sha}",
          {
            owner,
            repo,
            commit_sha: latestCommitSha,
          },
        );
        const baseTreeSha = latestCommit.tree.sha;

        // 4. Create a new tree with the blobs from our changes
        const { data: newTree } = await this.octokit.request(
          "POST /repos/{owner}/{repo}/git/trees",
          {
            owner,
            repo,
            base_tree: baseTreeSha,
            tree: blobs.map(
              (blob, index) =>
                ({
                  path: commit.changes[index].path.replace(/^\//, ""),
                  mode: "100644",
                  type: "blob",
                  sha: blob.data.sha,
                }) as const,
            ),
          },
        );

        // 5. Create a new commit with the new tree and parent to the latest commit
        const { data: newCommit } = await this.octokit.request(
          "POST /repos/{owner}/{repo}/git/commits",
          {
            owner,
            repo,
            message: commit.message,
            tree: newTree.sha,
            parents: [latestCommitSha],
          },
        );

        // 6. Update the branch to point to the new commit
        await this.octokit.request(
          "PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}",
          {
            owner,
            repo,
            branch,
            sha: newCommit.sha,
          },
        );
      }

      const stagedCommitsCount = this.stagedCommits.length;
      this.stagedCommits = [];

      return stagedCommitsCount;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      throw error;
    }
  }

  async get(path: string): Promise<string> {
    const { owner, repo, branch = "main" } = this.config;
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        ref: branch,
      },
    );

    if (!("content" in response.data)) {
      throw new GitDBError("File not found");
    }

    const content = response.data.content;
    return Buffer.from(content, "base64").toString("utf-8");
  }

  getOctokit(): Octokit {
    return this.octokit;
  }
}
