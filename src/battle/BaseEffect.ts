export abstract class BaseEffect {
    protected timer = 0;

    protected shouldTick(interval?: number): boolean {
        if (!interval) return false;

        this.timer++;

        if (this.timer < interval) return false;

        this.timer = 0;
        return true;
    }
} 