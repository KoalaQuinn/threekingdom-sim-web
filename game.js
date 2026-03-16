// 三国立志传：草莽英雄 - Pure JavaScript
// 黄巾起义 184年1月 → 诸侯讨董 190年12月 = 84回合 MVP
// Player: 流落乡野平民，目标活下去

const game = {
    // 日期
    date: {
        year: 184,
        month: 1,
    },

    // 玩家三属性
    player: {
        force:    {val: 40, lv: 1, exp: 0},  // 武力 → 战斗/开垦
        intel:   {val: 40, lv: 1, exp: 0},  // 智力 → 政务/事件
        charisma:{val: 40, lv: 1, exp: 0},  // 魅力 → 招募/对话
    },

    // 核心资源
    res: {
        money:  100,  // 钱币
        grain:  100,  // 粮食 → 每月消耗，负了饿死
        soldier: 0,    // 私兵 → 战斗，吃粮食
    },

    // 坞堡等级定义
    fortDef: [
        {
            lv: 1,
            name: "破败草庐",
            costMoney: 0,
            costGrain: 0,
            upkeep: 10,   // 每月粮食消耗
            yieldGrain: 15, // 每月产出
            yieldMoney: 0,
            unlock: null,
        },
        {
            lv: 2,
            name: "乡间篱落",
            costMoney: 500,
            costGrain: 500,
            upkeep: 30,
            yieldGrain: 60,
            yieldMoney: 10,
            unlock: "recruit", // 解锁募兵
        },
        {
            lv: 3,
            name: "坚固坞堡",
            costMoney: 2000,
            costGrain: 3000,
            upkeep: 100,
            yieldGrain: 200,
            yieldMoney: 50,
            unlock: "defense", // 贼寇防御+20
        },
        {
            lv: 4,
            name: "乱世壁垒",
            costMoney: 5000,
            costGrain: 8000,
            upkeep: 300,
            yieldGrain: 500,
            yieldMoney: 200,
            unlock: "refuge", // 随机流民投奔
        },
    ],
    fortLv: 1, // 当前等级

    // 行动力
    ap: 3,
    apMax: 3,

    // MVP 三个 NPC
    npcs: {
        liuBei:   {name: "刘备", affinity: 0, unlocked: false},
        zhangFei: {name: "张飞", affinity: 0, unlocked: false},
        huaTuo:   {name: "华佗", affinity: 0, unlocked: false},
    },

    // 历史日志
    log: ["184年 1月：黄巾起义爆发，天下大乱，你流落乡野..."],

    // 离线积累
    offline: {
        months: 0,
        maxMonths: 12,
        lastUpdate: Date.now(),
    },

    // === getters ===
    get currentFort() {
        return this.fortDef[this.fortLv - 1];
    },

    // === 初始化 ===
    init: function() {
        this.load();
        this.renderAll();
    },

    reset: function() {
        if (!confirm("确定重置游戏？所有进度会丢失。")) return;
        localStorage.removeItem("threekingdom-caocao");
        location.reload();
    },

    // === 存档 ===
    save: function() {
        localStorage.setItem("threekingdom-caocao", JSON.stringify({
            date: this.date,
            player: this.player,
            res: this.res,
            fortLv: this.fortLv,
            ap: this.ap,
            npcs: this.npcs,
            log: this.log,
            offline: this.offline,
        }));
    },

    load: function() {
        const save = localStorage.getItem("threekingdom-caocao");
        if (save) Object.assign(this, JSON.parse(save));
    },

    // === 离线 ===
    calcOffline: function() {
        const now = Date.now();
        const days = (now - this.offline.lastUpdate) / (1000 * 60 * 60 * 24);
        let months = Math.floor(days / 30);
        months = Math.min(months, this.offline.maxMonths - this.offline.months);
        if (months <= 0) return;
        this.offline.months += months;
        this.render();
    },

    claimOffline: function() {
        if (this.offline.months <= 0) return;
        const f = this.currentFort;
        for (let i = 0; i < this.offline.months; i++) {
            this.res.grain += f.yieldGrain;
            this.res.money += f.yieldMoney;
        }
        this.offline.months = 0;
        this.offline.lastUpdate = Date.now();
        this.save();
        this.render();
        this.notice(`领取了 ${this.offline.months} 个月产出！`);
    },

    // === 行动力 ===
    useAP: function() {
        if (this.ap <= 0) {
            this.notice("行动力用完了，请结束本月！");
            return false;
        }
        this.ap--;
        this.render();
        this.save();
        return true;
    },

    // === 属性升级 ===
    checkAttrUpgrade: function(attr) {
        const needExp = this.player[attr].lv * 10;
        if (this.player[attr].exp >= needExp) {
            this.player[attr].exp -= needExp;
            this.player[attr].lv++;
            this.player[attr].val += 5;
            const name = attr === 'force' ? '武力' : attr === 'intel' ? '智力' : '魅力';
            this.notice(`${name} 升级！Lv.${this.player[attr].lv}`);
        }
    },

    // === 行动 ===
    // 1. 亲自开垦
    actionClearLand: function() {
        if (!this.useAP()) return;
        const base = 10;
        const gain = Math.floor(base * (1 + this.player.force.val / 100));
        this.res.grain += gain;
        this.addLog(`你亲自开垦荒地，获得 ${gain} 粮食`);
        this.render();
    },

    // 2. 挑灯夜读
    actionStudy: function() {
        if (!this.useAP()) return;
        this.player.intel.exp += 10;
        this.checkAttrUpgrade('intel');
        this.addLog(`你挑灯夜读，智力经验 +10`);
        this.render();
    },

    // === 坞堡升级 ===
    upgradeFortress: function() {
        if (this.fortLv >= this.fortDef.length) {
            this.notice("坞堡已满级！");
            return;
        }
        const next = this.fortLv + 1;
        const def = this.fortDef[next - 1];
        if (this.res.money < def.costMoney || this.res.grain < def.costGrain) {
            this.notice("资源不足，无法升级！");
            return;
        }
        this.res.money -= def.costMoney;
        this.res.grain -= def.costGrain;
        this.fortLv = next;
        this.addLog(`坞堡升级 → ${def.name}`);
        this.save();
        this.render();
        this.notice(`坞堡升级成功！${def.name}`);
    },

    // === 街市 ===
    // 官署
    showGov: function() {
        if (!this.useAP()) return;
        const html = `
            <h3>🏛️ 郡府徭役</h3>
            <p>郡守招收徭役，完成干活获得俸禄，需要智力检定。</p>
            <div class="event-option">
                <button onclick="game.doGovTask()">接受徭役（智力检定 > 50）</button>
            </div>
        `;
        document.getElementById('locationContent').innerHTML = html;
    },

    doGovTask: function() {
        const success = this.roll(this.player.intel.val, 50);
        if (success) {
            const money = 50 + Math.floor(this.player.intel.val);
            this.res.money += money;
            this.player.intel.exp += 5;
            this.checkAttrUpgrade('intel');
            this.addLog(`完成徭役，获得 ${money} 钱币`);
            this.closeEvent();
            this.render();
        } else {
            const money = 20;
            this.res.money += money;
            this.addLog(`徭役完成不佳，获得 ${money} 钱币`);
            this.closeEvent();
            this.render();
        }
    },

    // 酒馆
    showTavern: function() {
        if (!this.useAP()) return;
        // 50% 概率刷出 NPC
        if (Math.random() < 0.5) {
            // 找未解锁的 NPC
            const candidates = Object.values(this.npcs).filter(n => !n.unlocked);
            if (candidates.length > 0) {
                // 随机一个
                const npc = candidates[Math.floor(Math.random() * candidates.length)];
                this.showNpcInvite(npc);
                return;
            }
        }
        // 否则随机事件
        this.triggerRandom();
    },

    showNpcInvite: function(npc) {
        const html = `
            <h3>🍶 酒馆偶遇</h3>
            <p>你在酒馆喝酒，正好碰到 ${npc.name} 一人独坐，可以花钱请客增加好感。</p>
            <div class="event-option">
                <button onclick="game.inviteNpc('${npc.name}')">请客喝酒 → 花费 30 钱，+10 好感</button>
            </div>
        `;
        this.openEvent(html);
    },

    inviteNpc: function(name) {
        if (this.res.money < 30) {
            this.notice("钱币不够，无法请客");
            return;
        }
        this.res.money -= 30;
        // find npc key
        const key = Object.keys(this.npcs).find(k => this.npcs[k].name === name);
        this.npcs[key].affinity += 10;
        if (this.npcs[key].affinity >= 100) {
            this.npcs[key].unlocked = true;
            this.addLog(`${name} 好感满了，解锁羁绊！`);
            this.notice(`${name} 羁绊解锁！`);
        } else {
            this.addLog(`请 ${name} 喝酒，好感 +10`);
        }
        this.closeEvent();
        this.render();
    },

    // 市集
    showMarket: function() {
        if (!this.useAP()) return;
        const html = `
            <h3>🏪 市集</h3>
            <p>买卖粮食</p>
            <div class="event-option">
                <button onclick="game.buyGrain(100)">买入 100 粮食 → 花费 50 钱</button>
                <button onclick="game.buyGrain(500)">买入 500 粮食 → 花费 250 钱</button>
                <button onclick="game.sellGrain(100)">卖出 100 粮食 → 得到 40 钱</button>
                <button onclick="game.sellGrain(500)">卖出 500 粮食 → 得到 200 钱</button>
            </div>
        `;
        document.getElementById('locationContent').innerHTML = html;
    },

    buyGrain: function(num) {
        const cost = Math.floor(num * 0.5);
        if (this.res.money < cost) {
            this.notice("钱币不够");
            return;
        }
        this.res.money -= cost;
        this.res.grain += num;
        this.addLog(`市集买入 ${num} 粮食`);
        this.render();
    },

    sellGrain: function(num) {
        const gain = Math.floor(num * 0.4);
        if (this.res.grain < num) {
            this.notice("粮食不够");
            return;
        }
        this.res.grain -= num;
        this.res.money += gain;
        this.addLog(`市集卖出 ${num} 粮食`);
        this.render();
    },

    // === 检定 ===
    roll: function(attrVal, diff) {
        const roll = Math.floor(Math.random() * 100) + 1;
        return (roll + attrVal) >= diff;
    },

    // === 结束月份 ===
    endMonth: function() {
        // 消耗
        const f = this.currentFort;
        const totalUpkeep = f.upkeep + this.res.soldier;
        this.res.grain -= totalUpkeep;

        // 检查失败：饿死 game over
        if (this.res.grain < 0) {
            this.gameOver();
            return;
        }

        // 产出
        this.res.grain += f.yieldGrain;
        this.res.money += f.yieldMoney;

        // 前进月份
        this.date.month++;
        if (this.date.month > 12) {
            this.date.month = 1;
            this.date.year++;
        }

        // 检查胜利：结束 190年12月
        if (this.date.year > 190 || (this.date.year === 190 && this.date.month > 12)) {
            this.gameWin();
            return;
        }

        // 记录
        this.addLog(`${this.date.year}年 ${this.date.month}月：回合结束`);

        // 重置 AP
        this.ap = this.apMax;
        this.offline.lastUpdate = Date.now();

        // 随机事件 30%
        if (Math.random() < 0.3) {
            this.triggerRandom();
        }

        this.save();
        this.render();
        this.notice("新的一月开始");
    },

    // === 事件 ===
    events: [
        {
            title: "黄巾残党过境",
            text: "一伙大约二十人的黄巾残路过你的坞堡，要求你交保护费。",
            options: [
                {text: "【武力硬刚】 武力+私兵 > 80", attr: "force", diff: 80, successText: "你击败了黄巾残党，缴获 150 钱", success: {money: 150}, failText: "你击退了黄巾，但被抢走一半粮食", fail: {grain: -Math.floor(game.res.grain / 2)}},
                {text: "【破财消灾】 交出 100 粮食，安全过关", successText: "黄巾拿了粮食走了，你安全过关", success: {grain: -100}},
            ]
        },
        {
            title: "流民求收留",
            text: "一群流民逃到你的坞堡外，请求收留，他们带着一点粮食。",
            options: [
                {text: "【收留】 魅力检定 > 50 → 留下粮食", attr: "charisma", diff: 50, successText: "流民感谢你，留下 80 粮食投奔", success: {grain: 80}, failText: "流民内乱抢了粮食跑了，你损失 30 粮食", fail: {grain: -30}},
                {text: "【赶走】 关门不放走，安全", successText: "你关上寨门，流民离开了", success: {}},
            ]
        }
    ],

    triggerRandom: function() {
        const ev = this.events[Math.floor(Math.random() * this.events.length)];
        let html = `<h3>${ev.title}</h3><p class="event-text">${ev.text}</p><div class="event-option">`;
        ev.options.forEach((opt, i) => {
            if (opt.attr) {
                html += `<button onclick="game.chooseEvent(${i})">${opt.text}</button>`;
            } else {
                html += `<button onclick="game.chooseEventSimple(${i})">${opt.text}</button>`;
            }
        });
        html += '</div>';
        // 保存当前事件
        window.currentEvent = ev;
        this.openEvent(html);
    },

    chooseEvent: function(idx) {
        const ev = window.currentEvent;
        const opt = ev.options[idx];
        const attr = this.player[opt.attr === 'force' ? 'force' : opt.attr === 'intel' ? 'intel' : 'charisma'];
        const success = this.roll(attr.val, opt.diff);
        if (success) {
            this.giveReward(opt.success);
            this.addLog(`[事件] ${ev.title} - ${opt.successText}`);
            this.notice(opt.successText);
        } else {
            this.giveReward(opt.fail);
            this.addLog(`[事件] ${ev.title} - ${opt.failText}`);
            this.notice(opt.failText);
        }
        this.closeEvent();
        this.render();
        delete window.currentEvent;
    },

    chooseEventSimple: function(idx) {
        const ev = window.currentEvent;
        const opt = ev.options[idx];
        this.giveReward(opt);
        this.addLog(`[事件] ${ev.title} - ${opt.text}`);
        this.notice(opt.successText);
        this.closeEvent();
        this.render();
        delete window.currentEvent;
    },

    giveReward: function(reward) {
        if (reward.money) this.res.money += reward.money;
        if (reward.grain) this.res.grain += reward.grain;
        if (reward.soldier) this.res.soldier += reward.soldier;
    },

    // === 游戏结束 ===
    gameOver: function() {
        this.openEvent(`
            <h2>💀 游戏结束</h2>
            <p>你没有粮食，最终饿死在了坞堡...</p>
            <p>终年 ${this.date.year} 年 ${this.date.month} 月</p>
            <div class="event-option">
                <button onclick="location.reload()">重新开始</button>
            </div>
        `);
    },

    gameWin: function() {
        // 结局评价
        let end = "";
        if (this.fortLv <= 1) end = "草根流民";
        else if (this.fortLv <= 2) end = "小有积蓄，一方草莽";
        else if (this.fortLv <= 3) end = "坞堡豪强，一郡闻名";
        else end = "州郡重臣，名留青史";

        this.openEvent(`
            <h2>🎉 恭喜通关</h2>
            <p>你成功活到了 190 年 12 月，诸侯讨董即将开始。</p>
            <p><strong>结局评价：${end}</strong></p>
            <p>当前坞堡：${this.currentFort.name} Lv.${this.fortLv}</p>
            <p>武力：${this.player.force.val} 智力：${this.player.intel.val} 魅力：${this.player.charisma.val}</p>
            <div class="event-option">
                <button onclick="location.reload()">重新开始</button>
            </div>
        `);
    },

    // === UI ===
    openEvent: function(html) {
        const modal = document.createElement('div');
        modal.id = 'eventModal';
        modal.className = 'event-modal show';
        modal.innerHTML = `<div class="event-content">${html}</div>`;
        document.body.appendChild(modal);
    },

    closeEvent: function() {
        document.getElementById('eventModal')?.remove();
    },

    addLog: function(text) {
        this.log.push(`${this.date.year}年 ${this.date.month}月：${text}`);
        const container = document.getElementById('historyLog');
        let html = '';
        // 反转，最新放上面
        [...this.log].reverse().forEach(line => {
            html += `<p>${line}</p>`;
        });
        container.innerHTML = html;
    },

    renderAll: function() {
        // 日期
        document.getElementById('yearText').textContent = this.date.year;
        document.getElementById('monthText').textContent = this.date.month;

        // 属性
        document.getElementById('forceVal').textContent = this.player.force.val;
        document.getElementById('forceLv').textContent = this.player.force.lv;
        document.getElementById('intVal').textContent = this.player.intel.val;
        document.getElementById('intLv').textContent = this.player.intel.lv;
        document.getElementById('chaVal').textContent = this.player.charisma.val;
        document.getElementById('chaLv').textContent = this.player.charisma.lv;

        // 资源
        document.getElementById('moneyText').textContent = this.res.money;
        document.getElementById('grainText').textContent = this.res.grain;
        document.getElementById('soldierText').textContent = this.res.soldier;

        // 坞堡
        const f = this.currentFort;
        document.getElementById('fortressLv').textContent = f.lv;
        document.getElementById('fortressName').textContent = f.name;
        document.getElementById('fortressUpkeep').textContent = f.upkeep;
        document.getElementById('fortressYield').textContent = `${f.yieldGrain} 粮食, ${f.yieldMoney} 钱币`;

        // AP
        document.getElementById('apText').textContent = `${this.ap}/${this.apMax}`;
        document.getElementById('apBar').style.width = `${(this.ap / this.apMax) * 100}%`;

        // 按钮
        document.getElementById('btnUpgradeFortress').disabled = this.fortLv >= this.fortDef.length || this.res.money < (this.fortDef[this.fortLv]?.costMoney || 99999) || this.res.grain < (this.fortDef[this.fortLv]?.costGrain || 99999);
        document.getElementById('btnActionClear').disabled = this.ap <= 0;
        document.getElementById('btnActionStudy').disabled = this.ap <= 0;

        // 离线
        document.getElementById('offlineMonth').textContent = this.offline.months;
        document.getElementById('offlineBar').style.width = `${(this.offline.months / this.offline.maxMonths) * 100}%`;
        document.getElementById('btnClaimOffline').disabled = this.offline.months <= 0;

        // NPC list
        this.renderNpc();
    },

    render: this.renderAll,

    renderNpc: function() {
        const container = document.getElementById('npcList');
        let html = '';
        for (let key in this.npcs) {
            const npc = this.npcs[key];
            html += `
                <div class="npc-item">
                    <div>
                        <strong>${npc.name}</strong>
                        ${npc.unlocked ? `<br><small>羁绊已解锁</small>` : `<br><small>好感：${npc.affinity}/100</small>`}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    },

    // 切换 tab
    switchTab: function(id) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.tab:nth-child(${this.tabIndex(id) + 1})`).classList.add('active');
        document.getElementById(id).classList.add('active');
    },

    tabIndex: function(id) {
        const tabs = ['fortress', 'city', 'history'];
        return tabs.indexOf(id);
    },

    // 弹窗
    notice: function(text) {
        const n = document.createElement('div');
        n.className = 'notice';
        n.textContent = text;
        document.querySelector('.header-card').appendChild(n);
        setTimeout(() => n.remove(), 3000);
    },

    openSettings: function() {
        document.getElementById('settingsModal').classList.add('show');
    },

    closeSettings: function() {
        document.getElementById('settingsModal').classList.remove('show');
    },
};
