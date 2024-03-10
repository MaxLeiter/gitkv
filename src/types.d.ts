interface IKVDBProvider {
  constructor: <Config>(config: Config) => void // Initialize the provider
  add: (path: string, data: string) => void // Queue changes
  commit: () => Promise<void> // Apply all queued changes
  push?: () => Promise<void> // Optional, depending on if the provider needs it
}
