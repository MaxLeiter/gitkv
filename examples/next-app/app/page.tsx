import { GithubProvider } from "git-db"
import path from "path";
import { revalidatePath } from "next/cache";

const provider = new GithubProvider({
  owner: "maxleiter",
  repo: "git-db",
  personalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN ?? "",
  branch: "test-branch"
})

const configFilePath = path.join("examples", "next-app", "public", "user-config.json");

export default async function Home(): Promise<JSX.Element> {
  let file;
  try {
    file = await provider.get(configFilePath);
  } catch (e) {
    file = "";
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 text-inherit">
      <form action={async (formData) => {
        "use server";

        await provider.set(configFilePath, formData.get("config") as string, "Update config");
        await provider.openPullRequest("Update config", "my PR", "main");
        revalidatePath("/");
      }}>
        <textarea
          name="config"
          defaultValue={file}
          className="w-full h-96 bg-gray-600 p-4 rounded-md"
        />
        <button type="submit">Save</button>
      </form>
    </main>
  );
}
