import { LowDatabase } from "../database.js";

class LevelSystem {
    private db: LowDatabase;
    private _level: number = 1;
    private _currentXp: number = 0;

    // Configuration for the curve
    private readonly BASE_XP: number = 200;  // XP needed for first level
    private readonly GROWTH_FACTOR: number = 1.15; // 15% increase per level

    constructor(db: LowDatabase) {
        if(!db) {
            throw new Error("Database instance is required");
        }

        this.db = db;
        this.initialize();
    }

    private async initialize() {
        await this.db.read();

        const { level , xp } = this.db.data?.user || {};
        if (!level || !xp) {
            this.db.data.user.level = 1;
            this.db.data.user.xp = 0;
            await this.db.write();
        }

        this._level = this.db.data.user.level;
        this._currentXp = this.db.data.user.xp;
    }

    public get level() {
        return this._level;
    }

    public get xp() {
        return this._currentXp;
    }

    public async getCurrent() {
        await this.db.read();
        this._level = this.db.data.user.level;
        this._currentXp = this.db.data.user.xp;
        return {
            level: this.db.data.user.level,
            xp: this.db.data.user.xp
        };
    }

    public get xpToNextLevel(): number {
        return Math.floor(this.BASE_XP * Math.pow(this.GROWTH_FACTOR, this._level - 1));
    }

    public async getProgress() {
        await this.getCurrent();
        return this._currentXp / this.xpToNextLevel;
    }

    public async addXp(amount: number) {
        if (amount <= 0) throw new Error("XP amount must be positive");

        // 1. Refresh data
        await this.getCurrent()

        let currentLevel = this._level;
        let currentXp = this._currentXp + amount;
        let leveledUp = false;

        // 2. Calculate new state in memory (Loop)
        // We use a local helper to calculate threshold based on the *changing* currentLevel
        const getThreshold = (lvl: number) =>
            Math.floor(this.BASE_XP * Math.pow(this.GROWTH_FACTOR, lvl - 1));

        while (currentXp >= getThreshold(currentLevel)) {
            currentXp -= getThreshold(currentLevel);
            currentLevel++;
            leveledUp = true;
        }

        // 3. Update DB Data object
        this.db.data.user.level = currentLevel;
        this.db.data.user.xp = currentXp;

        // 4. Perform ONE single write to disk
        await this.db.write();

        if (leveledUp) {
            console.log(`🎉 Leveled up to ${currentLevel}!`);
        }
    }

    public async completeTask() {
        const xpGained = Math.floor(this.random(5, 20));
        await this.addXp(xpGained);
    }

    private async levelUp() {
        this._level++;
        this.db.data.user.level = this._level;
        await this.db.write();
    }

    private random(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }
}


export { LevelSystem };


