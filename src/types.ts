export interface Change {
  path: string;
  // TODO: support JSONValue
  data: string;
}

export interface Commit {
  changes: Change[];
  timestamp: number; // Date.now()
  message: string;
}

export interface IKVDBProvider {
  /** Add a change to the current commit */
  add: (path: string, data: string) => void;
  /** Commit the current changes */
  commit: (message: string) => Commit;
  /** Push the current commit to the remote */
  push: () => Promise<number>;

  /** Shorthand for `add`, `commit`, and `push` */
  set: (path: string, data: string, message: string) => Promise<Commit>;
  /** Gets the latest version of a file */
  get: (path: string) => Promise<string>;
  /** Changes the branch */
  changeBranch: (branch: string) => void;
}
