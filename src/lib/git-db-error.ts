export class GitKVError extends Error {
  constructor(message: string, stack?: string) {
    super(message);
    this.name = "GitKVError";
    this.stack = stack;
  }
}
