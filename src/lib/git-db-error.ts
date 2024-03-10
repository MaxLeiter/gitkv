export class GitDBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitDBError";
  }
}
