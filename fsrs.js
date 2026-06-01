class FSRS {
    constructor() {
        // FSRS 全局参数 (默认最优参数)
        this.w = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61];
        this.requestRetention = 0.9;
        this.maxInterval = 36500;
    }

    createCard() {
        return {
            due: new Date(),
            stability: 0,
            difficulty: 0,
            elapsedDays: 0,
            scheduledDays: 0,
            review: new Date(),
            state: 0 // 0:New 1:Learning 2:Review 3:Relearning
        };
    }

    constrainDifficulty(d) {
        return Math.max(1, Math.min(10, d));
    }

    initDifficulty(rating) {
        return this.constrainDifficulty(
            this.w[4] - (rating - 1) * this.w[5]
        );
    }

    nextInterval(stability) {
        const interval = stability * (1 + this.w[17]) / this.requestRetention;
        return Math.min(Math.round(interval), this.maxInterval);
    }

    // 单次复习，返回4个评分对应的新卡片状态
    repeat(card, now) {
        const state = card.state;
        const newCards = [];
        const ratings = [1, 2, 3, 4];

        for (const r of ratings) {
            const c = JSON.parse(JSON.stringify(card));
            c.review = new Date(now);
            c.elapsedDays = Math.round((now - new Date(c.due)) / (1000 * 86400));

            if (state === 0) {
                // New 新卡片
                c.state = 1;
                c.difficulty = this.initDifficulty(r);
                c.stability = this.w[r - 1];
                const ivl = [0, 0, 1, 2][r - 1];
                c.scheduledDays = ivl;
                c.due = new Date(now.getTime() + ivl * 86400000);
            } else if (state === 1 || state === 3) {
                // Learning / Relearning
                const base = [0, 1, 1, 2][r - 1];
                c.scheduledDays = base;
                c.due = new Date(now.getTime() + base * 86400000);
                if (r >= 3) {
                    c.state = 2;
                    c.stability = this.w[7] * c.difficulty ** -this.w[8];
                }
            } else if (state === 2) {
                // Review 复习卡片
                const decay = 1 - Math.pow(this.requestRetention, 1 / c.stability);
                const deltaD = -this.w[15] * (r - 3);
                c.difficulty = this.constrainDifficulty(c.difficulty + deltaD);

                let newStab;
                if (r === 1) {
                    c.state = 3;
                    newStab = c.stability * this.w[11];
                } else {
                    const factor = [0, this.w[12], this.w[13], this.w[14]][r - 1];
                    newStab = c.stability * (1 + Math.exp(this.w[10]) * (11 - c.difficulty) * c.stability ** -this.w[9] * factor);
                }
                c.stability = newStab;
                const ivl = this.nextInterval(c.stability);
                c.scheduledDays = ivl;
                c.due = new Date(now.getTime() + ivl * 86400000);
            }
            newCards.push(c);
        }
        return newCards;
    }
}
