export class SeededRandom {

  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 0x19660D + 0x3C6EF35F) >>> 0;
    return this.seed / 0x100000000;
  }

  float(min: number, max: number): number {
    return min + (this.next() * (max - min));
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max));
  }

  bool(chance: number = 0.5): boolean {
    if (chance < 0 || chance > 1) throw new Error("Chance must be between 0 and 1");
    return this.next() < chance;
  }

  choice<T>(choices: T[]): T {
    return choices[this.int(0, choices.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return shuffled;
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed >>> 0;
  }

}
