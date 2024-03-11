# gitkv

This is a key-value based "database" library that uses Git for the underlying storage. It provides a get/set interface for storing and retrieving data using hosted on GitHub. Other providers can be added in the future. This is useful in scenarios where your data will be deployed / accessible from high-speed
data sources, but you don't care about your write latency.

Inspired by [this @cramforce tweet](https://twitter.com/cramforce/status/1441060730730734593). I don't necessarily recommend using this in production.
Mostly written by [claude-3-opus](https://www.anthropic.com/news/claude-3-family).

## Features

- Set and retrieve key-value pairs using a simple API
- Automatically commit and push changes to a GitHub repository
- Create and manage branches for organizing data
- Open pull requests programmatically
- Retrieve file contents from the repository

## Installation

To use this library in your project, you can install it via npm:

```bash
pnpm i gitkv
# or yarn add gitkv
# or npm i gitkv
```

## Usage

First, import the `GithubProvider` class from the library:

```typescript
import { GithubProvider } from "gitkv";
```

Then create an instance of the `GithubProvider`:

```typescript
const config = {
  personalAccessToken: "YOUR_GITHUB_PERSONAL_ACCESS_TOKEN",
  repo: "YOUR_REPOSITORY_NAME",
  branch: "BRANCH_NAME", // Optional, defaults to 'main'
  owner: "YOUR_GITHUB_USERNAME",
};

const provider = new GithubProvider(config);
```

### Setting a Key-Value Pair

To set a key-value pair, use the `set` method:

```typescript
const path = "path/to/your/key"; // The path to the key relative from the root of the repository
const data = "Your data goes here";
const message = "Commit message";

// Commits and pushes the changes to the repository. To queue multiple changes, use the `add` method.
const commit = await provider.set(path, data, message);
```

### Retrieving a Value

To retrieve the value associated with a key, use the `get` method:

```typescript
const path = "path/to/your/key";

const value = await provider.get(path);
```

You likely want to implement some caching around your `get` calls, as this will be slow.

### Staging Changes

You can also stage changes using the `add` method (similar to `git add`):

```typescript
provider.add("path/to/your/key", "Your data goes here");
```

### Committing Changes

To commit the staged changes, use the `commit` method:

```typescript
const commit = provider.commit("Commit message");
```

### Pushing Changes

To push the committed changes to the GitHub repository, use the `push` method:

```typescript
const commitCount = await provider.push();
```

### Opening a Pull Request

You can open a pull request programmatically using the `openPullRequest` method:

```typescript
const pullRequestUrl = await provider.openPullRequest(
  "Pull Request Title",
  "Pull Request Body",
  "head-branch",
);
```

## Error Handling

The library throws a `GitKVError` when an error occurs. You can catch and handle these errors in your code:

```typescript
import { GitKVError } from "gitkv";

try {
  // Your code here
} catch (error) {
  if (error instanceof GitKVError) {
    console.error("Git DB Error:", error.message);
  } else {
    console.error("Unknown Error:", error);
  }
}
```

## License

This library is open-source and available under the [MIT License](LICENSE).
