// type JSONValue = string | number | boolean | null | JSONArray | JSONObject;
// interface JSONArray extends Array<JSONValue> {}
// // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- circular record if we use a type
// interface JSONObject {
//   [key: string]: JSONValue;
// }

interface Change {
  path: string;
  // TODO: support JSONValue
  data: string;
}

interface Commit {
  changes: Change[];
  timestamp: number; // Date.now()
  message: string;
}

interface IKVDBProvider {
  /** Add a change to the current commit */
  add: (path: string, data: string) => void;
  /** Commit the current changes */
  commit: (message: string) => Commit;
  /** Push the current commit to the remote */
  push: () => Promise<number>;
  /** Shorthand for `add`, `commit`, and `push` */
  save: (path: string, data: string, message: string) => Promise<Commit>;
  /** Gets the latest version of a file */
  get: (path: string) => Promise<string>;
}
