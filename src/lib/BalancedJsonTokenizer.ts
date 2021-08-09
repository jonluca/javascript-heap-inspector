export class BalancedJSONTokenizer {
  private readonly callback: (arg0: string) => void;
  private index: number;
  private balance: number;
  private buffer: string;
  private findMultiple: boolean;
  private closingDoubleQuoteRegex: RegExp;
  private lastBalancedIndex?: number;
  constructor(callback: (arg0: string) => void, findMultiple?: boolean) {
    this.callback = callback;
    this.index = 0;
    this.balance = 0;
    this.buffer = "";
    this.findMultiple = findMultiple || false;
    this.closingDoubleQuoteRegex = /[^\\](?:\\\\)*"/g;
  }

  write(chunk: string): boolean {
    this.buffer += chunk;
    const lastIndex = this.buffer.length;
    const buffer = this.buffer;
    let index;
    for (index = this.index; index < lastIndex; ++index) {
      const character = buffer[index];
      if (character === '"') {
        this.closingDoubleQuoteRegex.lastIndex = index;
        if (!this.closingDoubleQuoteRegex.test(buffer)) {
          break;
        }
        index = this.closingDoubleQuoteRegex.lastIndex - 1;
      } else if (character === "{") {
        ++this.balance;
      } else if (character === "}") {
        --this.balance;
        if (this.balance < 0) {
          this.reportBalanced();
          return false;
        }
        if (!this.balance) {
          this.lastBalancedIndex = index + 1;
          if (!this.findMultiple) {
            break;
          }
        }
      } else if (character === "]" && !this.balance) {
        this.reportBalanced();
        return false;
      }
    }
    this.index = index;
    this.reportBalanced();
    return true;
  }

  private reportBalanced(): void {
    if (!this.lastBalancedIndex) {
      return;
    }
    this.callback(this.buffer.slice(0, this.lastBalancedIndex));
    this.buffer = this.buffer.slice(this.lastBalancedIndex);
    this.index -= this.lastBalancedIndex;
    this.lastBalancedIndex = 0;
  }

  remainder(): string {
    return this.buffer;
  }
}
