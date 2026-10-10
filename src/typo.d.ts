declare module "typo-js" {
  export default class Typo {
    constructor(
      language: string,
      aff: string,
      dic: string,
      options?: { platform?: string },
    );
    check(word: string): boolean;
    suggest(word: string, limit?: number): string[];
  }
}
