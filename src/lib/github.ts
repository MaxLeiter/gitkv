import type { Octokit } from "@octokit/core";
import { GitDBError } from "./git-db-error";

export async function createGithubBranch({
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
  console.log({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: await getSha(octokit, owner, repo, rootBranch),
  });
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
    throw new GitDBError("Failed to create branch");
  }
}

export async function removeGithubBranch({
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
    throw new GitDBError(`Cannot delete ${branch} branch`);
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
    throw new GitDBError("Failed to delete branch");
  }
}

const getSha = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> => {
  const { data: refData } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/heads/{branch}",
    {
      owner,
      repo,
      branch,
    },
  );
  console.log(refData);
  return refData.object.sha;
};
