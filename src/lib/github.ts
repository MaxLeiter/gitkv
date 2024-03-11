import type { Octokit } from "@octokit/core";
import { GitKVError } from "./git-db-error";
import type { Change } from "@/types";

export const createGithubBranch = async function ({
  branch,
  rootBranch = "main",
  owner,
  repo,
  octokit,
}: {
  branch: string;
  rootBranch?: string;
  owner: string;
  repo: string;
  octokit: Octokit;
}): Promise<void> {
  const response = await octokit.request(
    "POST /repos/{owner}/{repo}/git/refs",
    {
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: await getSha(octokit, owner, repo, rootBranch),
    },
  );

  if (response.status !== 201) {
    throw new GitKVError("Failed to create branch");
  }
};

export const removeGithubBranch = async function ({
  branch,
  owner,
  repo,
  octokit,
}: {
  branch: string;
  owner: string;
  repo: string;
  octokit: Octokit;
}): Promise<void> {
  if (branch === "main" || branch === "master") {
    throw new GitKVError(`Cannot delete ${branch} branch`);
  }

  const response = await octokit.request(
    "DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}",
    {
      owner,
      repo,
      branch,
    },
  );

  if (response.status !== 204) {
    throw new GitKVError("Failed to delete branch");
  }
};

export const getSha = async function (
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  const { data: refData } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/heads/{branch}",
    {
      owner,
      repo,
      branch,
    },
  );
  return refData.object.sha;
};

export const createBlobs = async function (
  octokit: Octokit,
  owner: string,
  repo: string,
  changes: Change[],
): Promise<Array<{ data: { sha: string } }>> {
  const blobsPromises = changes.map(
    async (change) =>
      await octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
        owner,
        repo,
        content: change.data ?? "",
        encoding: "utf-8",
      }),
  );
  return await Promise.all(blobsPromises);
};

export const getLatestCommit = async function (
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ sha: string; treeSha: string }> {
  const { data: refData } = (await octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/heads/{branch}",
    {
      owner,
      repo,
      branch,
    },
  )) as { data: { object: { sha: string } } };

  const latestCommitSha = refData.object.sha;

  const { data: latestCommit } = (await octokit.request(
    "GET /repos/{owner}/{repo}/git/commits/{commit_sha}",
    {
      owner,
      repo,
      commit_sha: latestCommitSha,
    },
  )) as { data: { tree: { sha: string } } };

  return { sha: latestCommitSha, treeSha: latestCommit.tree.sha };
};

export const createNewTree = async function (
  octokit: Octokit,
  owner: string,
  repo: string,
  baseTreeSha: string,
  changes: Change[],
  blobs: Array<{ data: { sha: string } }>,
): Promise<{ data: { sha: string } }> {
  return await octokit.request("POST /repos/{owner}/{repo}/git/trees", {
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: blobs.map(
      (blob, index) =>
        ({
          path: changes[index].path.replace(/^\//, ""),
          mode: "100644",
          type: "blob",
          sha: blob.data.sha,
        }) as const,
    ),
  });
};

export const createNewCommit = async function (
  octokit: Octokit,
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentSha: string,
): Promise<{ data: { sha: string } }> {
  return await octokit.request("POST /repos/{owner}/{repo}/git/commits", {
    owner,
    repo,
    message,
    tree: treeSha,
    parents: [parentSha],
  });
};

export const updateBranchRef = async function (
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
): Promise<void> {
  await octokit.request("PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}", {
    owner,
    repo,
    branch,
    sha,
  });
};

export const getFileContent = async function (
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<string> {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path,
      ref: branch,
    },
  );

  if (!("content" in response.data)) {
    throw new GitKVError("File not found");
  }

  const content = response.data.content;
  return Buffer.from(content, "base64").toString("utf-8");
};

export const openPullRequest = async function ({
  octokit,
  owner,
  repo,
  title,
  head,
  base,
  body,
}: {
  octokit: Octokit;
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
}): Promise<string> {
  const response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
    owner,
    repo,
    title,
    head,
    base,
    body,
  });

  if (response.status !== 201) {
    throw new GitKVError("Failed to create pull request");
  }

  return response.data.url;
};
