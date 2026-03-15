class StreamingStore {
  #isGenerating = $state(false);
  #isPaused = $state(false);
  #autoScroll = $state(true);
  #controller: AbortController | null = null;

  #thinkingContent = $state('');
  #responseContent = $state('');
  #isThinkingPhase = $state(false);
  #isWaitingForFirstToken = $state(false);

  get isGenerating() { return this.#isGenerating; }
  get isPaused() { return this.#isPaused; }
  get autoScroll() { return this.#autoScroll; }
  get thinkingContent() { return this.#thinkingContent; }
  get responseContent() { return this.#responseContent; }
  get isThinkingPhase() { return this.#isThinkingPhase; }
  get isWaitingForFirstToken() { return this.#isWaitingForFirstToken; }

  start(): void {
    this.#controller = new AbortController();
    this.#isGenerating = true;
    this.#isPaused = false;
    this.#thinkingContent = '';
    this.#responseContent = '';
    this.#isThinkingPhase = false;
    this.#isWaitingForFirstToken = true;
  }

  stop(): void {
    this.#controller?.abort();
    this.#controller = null;
    this.#isGenerating = false;
    this.#isPaused = false;
    this.#isWaitingForFirstToken = false;
  }

  togglePause(): void {
    this.#isPaused = !this.#isPaused;
  }

  setAutoScroll(value: boolean): void {
    this.#autoScroll = value;
  }

  setThinking(text: string): void {
    this.#isThinkingPhase = true;
    this.#thinkingContent = text;
    this.#isWaitingForFirstToken = false;
  }

  appendThinking(text: string): void {
    this.#isThinkingPhase = true;
    this.#thinkingContent += text;
    this.#isWaitingForFirstToken = false;
  }

  appendResponse(text: string): void {
    this.#responseContent += text;
    this.#isWaitingForFirstToken = false;
  }

  getSignal(): AbortSignal | undefined {
    return this.#controller?.signal;
  }

  reset(): void {
    this.#thinkingContent = '';
    this.#responseContent = '';
    this.#isThinkingPhase = false;
  }

  finish(): void {
    this.#controller = null;
    this.#isGenerating = false;
    this.#isPaused = false;
    this.#isWaitingForFirstToken = false;
  }
}

export const streamingStore = new StreamingStore();
