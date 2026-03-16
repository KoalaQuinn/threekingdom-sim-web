// 三国立志传：草莽英雄 - 纯JavaScript网页版
// 黄巾起义 184年1月 → 诸侯讨董 190年12月 = 84回合

const game = {
    // 游戏日期
    date: {
        year: 184,
        month: 1,
    },
    // 玩家主角属性
    player: {
        force: {value: 40, level: 1, exp: 0}, // 武力
        intelligence: {value: 40, level: 1, exp: 0}, // 智力
        charisma: {value: 40, level: 1, exp: 0}, // 魅力
    },
    // 核心资源
    resources: {
        money: 100,    // 钱币
        grain: 100,     // 粮食
        soldier: 0,     // 私兵
    },
    // 坞堡等级定义
    fortressLevels: [
        {
            level: 1,
            name: "破败草庐",
            costMoney: 0,
            costGrain: 0,
            upkeepGrain: 10,
            yieldGrain: 15,
            yieldMoney: 0,
            unlock: null
        },
        {
            level: 2,
            name: "乡间篱落",
            costMoney: 500,
            costGrain: 500,
            upkeepGrain: 30,
            yieldGrain: 60,
            yieldMoney: 10,
            unlock: "recruit" // 解锁招募私兵
        },
        {
            level: 3,
            name: "坚固坞堡",
            costMoney: 2000,
            costGrain: 3000,
            upkeepGrain: 100,
            yieldGrain: 200,
            yieldMoney: 50,
            unlock: "defenseBonus" // 贼寇防御+20
        },
        {
            level: 4,
            name: "乱世壁垒",
            costMoney: 5000,
            costGrain: 8000,
            upkeepGrain: 300,
            yieldGrain: 500,
            yieldMoney: 200,
            unlock: "refuge" // 随机流民
        }
    ],
    fortressLevel: 1, // 当前坞堡等级

    // 行动力
    actionPoints: 3,
    maxActionPoints: 3,

    // NPC 羁绊
    npcs: {
        liuBei: {name: "刘备", affinity: 0, unlocked: false},
        zhangFei: {name: "张飞", affinity: 0, unlocked: false},
        huaTuo: {name: "华佗", affinity: 0, unlocked: false},
    },

    // 天下大势日志
    historyLog: ["184年 1月：黄巾起义爆发，天下大乱，你流落乡野..."],

    // 离线积累
    offlineAccumulation: {
        accumulatedMonths: 0,
        maxAccumulateMonths: 12,
        lastUpdate: Date.now(),
    },

    lastSaveTime: Date.now(),

    // 坞堡等级信息
    get currentFortress() {
        return this.fortressLevels[this.fortressLevel - 1];
    },

    // ========== 初始化 ==========
    init: function() {
        this.resetAllData();
        this.load();
        this.initDefaultData();
        this.calculateOfflineReward();
        this.renderAll();
    },

    resetAllData: function() {
        this.date = {year: 184, month: 1};
        this.player = {
            force: {value: 40, level: 1, exp: 0},
            intelligence: {value: 40, level: 1, exp: 0},
            charisma: {value: 40, level: 1, exp: 0},
        };
        this.resources = {money: 100, grain: 100, soldier: 0};
        this.fortressLevel = 1;
        this.actionPoints = this.maxActionPoints;
        this.npcs = {
            liuBei: {name: "刘备", affinity: 0, unlocked: false},
            zhangFei: {name: "张飞", affinity: 0, unlocked: false},
            huaTuo: {name: "华佗", affinity: 0, unlocked: false},
        };
        this.historyLog = ["184年 1月：黄巾起义爆发，天下大乱，你流落乡野..."];
        this.offlineAccumulation = {
            accumulatedMonths: 0,
            maxAccumulateMonths: 12,
            lastUpdate: Date.now(),
        };
        this.lastSaveTime = Date.now();
    },

    initDefaultData: function() {
        // 默认初始化完成
    },

    // ========== 存档加载 ==========
    save: function() {
        localStorage.setItem('threekingdom-caocao', JSON.stringify({
            date: this.date,
            player: this.player,
            resources: this.resources,
            fortressLevel: this.fortressLevel,
            actionPoints: this.actionPoints,
            npcs: this.npcs,
            historyLog: this.historyLog,
            offlineAccumulation: this.offlineAccumulation,
            lastSaveTime: this.lastSaveTime,
        }));
    },

    load: function() {
        const saved = localStorage.getItem('threekingdom-caocao');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(this, data);
        }
    },

    // ========== 离线计算 ==========
    calculateOfflineReward: function() {
        const now = Date.now();
        const elapsedMs = now - this.offlineAccumulation.lastUpdate;
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        const elapsedMonths = Math.floor(elapsedDays / 30);
        if (elapsedMonths <= 0) return;

        const addMonths = Math.min(elapsedMonths, this.offlineAccumulation.maxAccumulateMonths - this.offlineAccumulation.accumulatedMonths);
        this.offlineAccumulation.accumulatedMonths += addMonths;
        this.renderFortress();
        this.renderOverview();
    },

    // 领取离线积累
    claimOfflineResources: function() {
        if (this.offlineAccumulation.accumulatedMonths <= 0) return;

        const f = this.currentFortress;
        const months = this.offlineAccumulation.accumulatedMonths;
        this.resources.grain += f.yieldGrain * months;
        this.resources.money += f.yieldMoney * months;

        // 清空积累
        this.offlineAccumulation.accumulatedMonths = 0;
        this.offlineAccumulation.lastUpdate = Date.now();
        this.save();
        this.renderAll();
        this.showNotice("领取了 " + months + " 个月的产出！");
    },

    // ========== 行动力和行动 ==========
    spendAP: function() {
        if (this.actionPoints <= 0) {
            this.showNotice("行动力已经用完了，请结束本月！");
            return false;
        }
        this.actionPoints--;
        this.renderAP();
        this.save();
        return true;
    },

    // 行动：亲自开垦
    actionClearLand: function() {
        if (!this.spendAP()) return;
        // 开垦获得粮食，受武力加成
        const baseGain = 10;
        const gain = Math.floor(baseGain * (1 + this.player.force.value / 100));
        this.resources.grain += gain;
        this.addHistory(`你亲自开垦荒地，获得 ${gain} 粮食`);
        this.renderAll();
    },

    // 行动：挑灯夜读
    actionStudy: function() {
        if (!this.spendAP()) return;
        // 增加智力经验
        this.player.intelligence.exp += 10;
        // 检查升级
        this.checkLevelUp('intelligence');
        this.addHistory(`你挑灯夜读，智力经验 +10`);
        this.renderAll();
    },

    // 检查属性升级
    checkLevelUp: function(attr) {
        const expNeeded = this.player[attr].level * 10;
        if (this.player[attr].exp >= expNeeded) {
            this.player[attr].exp -= expNeeded;
            this.player[attr].level++;
            this.player[attr].value += 5;
            this.showNotice(`${attr === 'force' ? '武力' : attr === 'intelligence' ? '智力' : '魅力'} 升级！Lv.${this.player[attr].level}`);
        }
    },

    // ========== 坞堡 ==========
    upgradeFortress: function() {
        if (this.fortressLevel >= this.fortressLevels.length) {
            this.showNotice("坞堡已经满级了！");
            return;
        }
        const nextLevel = this.fortressLevel + 1;
        const nextDef = this.fortressLevels[nextLevel - 1];
        if (this.resources.money < nextDef.costMoney || this.resources.grain < nextDef.costGrain) {
            this.showNotice("资源不足，无法升级！");
            return;
        }
        // 扣资源升级
        this.resources.money -= nextDef.costMoney;
        this.resources.grain -= nextDef.costGrain;
        this.fortressLevel = nextLevel;
        this.addHistory(`坞堡升级为 ${nextDef.name}`);
        this.save();
        this.renderAll();
        this.showNotice(`坞堡升级成功！${nextDef.name}`);
    },

    // ========== 街市地点 ==========
    governmentMenu: function() {
        if (!this.spendAP()) return;
        const html = `
            <h3>🏛️ 官署</h3>
            <p>郡府招收徭役，完成任务可以获得俸禄。</p>
            <button onclick="game.doGovernmentTask()" style="width: 100%; margin-top: 10px;">接取徭役任务（消耗 1AP 已消耗）</button>
        `;
        document.getElementById('locationContent').innerHTML = html;
    },

    doGovernmentTask: function() {
        // 智力检定
        const success = this.checkRoll(this.player.intelligence.value, 50);
        let money = 0;
        if (success) {
            money = 50 + Math.floor(this.player.intelligence.value);
            this.resources.money += money;
            this.player.intelligence.exp += 5;
            this.checkLevelUp('intelligence');
            this.addHistory(`完成徭役任务，获得 ${money} 钱币`);
            this.renderAll();
            this.closeEventModal();
        } else {
            money = 20;
            this.resources.money += money;
            this.addHistory(`徭役任务完成不佳，获得 ${money} 钱币`);
            this.renderAll();
            this.closeEventModal();
        }
    },

    tavernMenu: function() {
        if (!this.spendAP()) return;
        // 50%概率刷出NPC
        const rand = Math.random();
        if (rand < 0.5) {
            // 随机一个NPC
            const npcKeys = Object.keys(this.npcs).filter(k => !this.npcs[k].unlocked);
            if (npcKeys.length > 0) {
                const npcKey = npcKeys[Math.floor(Math.random() * npcKeys.length)];
                const npc = this.npcs[npcKey];
                this.showNpcInvite(npc);
                return;
            }
        }
        // 随机事件
        this.triggerRandomEvent();
    },

    showNpcInvite: function(npc) {
        let html = `
            <h3>🍶 酒馆偶遇</h3>
            <p>你在酒馆喝酒，遇到了 ${npc.name}，对方也正好一个人喝酒，可以花钱请客刷好感。</p>
            <div class="event-option">
                <button onclick="game.inviteNpc('${npc.name}')">请客喝酒（花费 30 钱币，+10 好感）</button>
            </div>
        `;
        this.openEventModal(html);
    },

    inviteNpc: function(npcName) {
        if (this.resources.money < 30) {
            this.showNotice("钱币不够，无法请客");
            return;
        }
        this.resources.money -= 30;
        this.npcs[npcName].affinity += 10;
        if (this.npcs[npcName].affinity >= 100) {
            this.npcs[npcName].unlocked = true;
            this.addHistory(`${npcName} 好感已满，解锁羁绊！`);
            this.showNotice(`${npcName} 羁绊解锁！`);
        } else {
            this.addHistory(`请 ${npcName} 喝酒，好感 +10`);
        }
        this.renderAll();
        this.closeEventModal();
    },

    marketMenu: function() {
        if (!this.spendAP()) return;
        const html = `
            <h3>🏪 市集</h3>
            <p>买卖物资</p>
            <div class="event-option">
                <button onclick="game.buyGrain(100)">买入粮食 100 → 花费 50 钱币</button>
                <button onclick="game.buyGrain(500)">买入粮食 500 → 花费 225 钱币</button>
                <button onclick="game.sellGrain(100)">卖出粮食 100 → 得到 40 钱币</button>
                <button onclick="game.sellGrain(500)">卖出粮食 500 → 得到 200 钱币</button>
            </div>
        `;
        document.getElementById('locationContent').innerHTML = html;
    },

    buyGrain: function(amount) {
        const cost = Math.floor(amount * 0.5);
        if (this.resources.money < cost) {
            this.showNotice("钱币不够");
            return;
        }
        this.resources.money -= cost;
        this.resources.grain += amount;
        this.addHistory(`市集买入 ${amount} 粮食`);
        this.renderAll();
    },

    sellGrain: function(amount) {
        if (this.resources.grain < amount) {
            this.showNotice("粮食不够");
            return;
        }
        const gain = Math.floor(amount * 0.4);
        this.resources.grain -= amount;
        this.resources.money += gain;
        this.addHistory(`市集卖出 ${amount} 粮食`);
        this.renderAll();
    },

    // ========== 检定 ==========
    // 隐性骰子 1-100，加上属性大于难度就算成功
    checkRoll: function(attributeValue, difficulty) {
        const roll = Math.floor(Math.random() * 100) + 1;
        return (roll + attributeValue) >= difficulty;
    },

    // ========== 结束月份 ==========
    endMonth: function() {
        // 扣除坞堡维护
        const f = this.currentFortress;
        const totalUpkeep = f.upkeepGrain + this.resources.soldier;
        this.resources.grain -= totalUpkeep;

        // 检查败北：粮食不够饿死
        if (this.resources.grain < 0) {
            this.gameOver();
            return;
        }

        // 坞堡产出
        this.resources.grain += f.yieldGrain;
        this.resources.money += f.yieldMoney;

        // 推进月份
        this.date.month++;
        if (this.date.month > 12) {
            this.date.month = 1;
            this.date.year++;
        }

        // 检查结局：到 190 年 12 月结束
        if (this.date.year >= 191 || (this.date.year === 190 && this.date.month > 12)) {
            this.gameWin();
            return;
        }

        // 添加历史
        this.addHistory(`${this.date.year}年 ${this.date.month}月：回合结束`);

        // 重置行动力
        this.actionPoints = this.maxActionPoints;
        this.offlineAccumulation.lastUpdate = Date.now();

        // 这里可以触发随机月度事件
        if (Math.random() < 0.3) {
            // 30% 概率月度事件
            // 先空着，以后加
        }

        this.save();
        this.renderAll();
        this.showNotice("新的一月开始了");
    },

    // ========== 游戏结束 ==========
    gameOver: function() {
        this.openEventModal(`
            <h2>💀 游戏结束</h2>
            <p>你没有粮食，最终饿死在了坞堡...</p>
            <p>终年 ${this.date.year} 年 ${this.date.month} 月</p>
            <div class="event-option">
                <button onclick="location.reload()">重新开始</button>
            </div>
        `);
    },

    gameWin: function() {
        // 结算结局
        let ending = "";
        if (this.fortressLevel <= 1) ending = "草根流民";
        else if (this.fortressLevel <= 2) ending = "小有积蓄，一方草莽";
        else if (this.fortressLevel <= 3) ending = "坞堡豪强，一郡闻名";
        else ending = "州郡重臣，名留青史";

        this.openEventModal(`
            <h2>🎉 游戏通关</h2>
            <p>你成功活到了 190 年 12 月，诸侯讨董即将开始。</p>
            <p><strong>结局评价：${ending}</strong></p>
            <p>当前坞堡：${this.currentFortress.name} Lv.${this.fortressLevel}</p>
            <p>武力：${this.player.force.value} 智力：${this.player.intelligence.value} 魅力：${this.player.charisma.value}</p>
            <div class="event-option">
                <button onclick="location.reload()">重新开始</button>
            </div>
        `);
    },

    // ========== 事件弹窗 ==========
    openEventModal: function(html) {
        const modal = document.createElement('div');
        modal.id = 'eventModal';
        modal.className = 'event-modal show';
        modal.innerHTML = `
            <div class="event-content">
                ${html}
            </div>
        `;
        document.body.appendChild(modal);
    },

    closeEventModal: function() {
        const modal = document.getElementById('eventModal');
        if (modal) modal.remove();
    },

    // ========== 随机事件 ==========
    randomEvents: [
        {
            title: "黄巾残党路过",
            text: "一伙大约二十人的黄巾残党路过你的坞堡，要求你交纳保护费。",
            options: [
                {text: "【武力硬刚】 武力检定 > 60", attr: "force", diff: 60, successText: "你杀出重围，击退黄巾，缴获 150 钱", successReward: {money: 150}, failText: "黄巾抢走一半粮食，你负伤击退他们", failReward: {grain: -Math.floor(game.resources.grain / 2)}},
                {text: "【破财消灾】 直接交出 100 粮食", successText: "黄巾拿了粮食走了，你安全度过", successReward: {grain: -100}},
            ]
        },
        {
            title: "流民求收留",
            text: "一队流民逃到你的坞堡外，请求收留，他们带了一些粮食。你选择：",
            options: [
                {text: "【收留】 魅力检定 > 50 → 增加粮食", attr: "charisma", diff: 50, successText: "流民感激你，留下 80 粮食投奔", successReward: {grain: 80}, failText: "流民内部抢了粮食逃跑了，你损失 30 粮食", failReward: {grain: -30}},
                {text: "【赶走】 关闭大门，不收留", successText: "你保住了粮食，流民离开了", successReward: {}},
            ]
        }
    ],

    triggerRandomEvent: function() {
        const event = this.randomEvents[Math.floor(Math.random() * this.randomEvents.length)];
        let html = `<h3>${event.title}</h3><p>${event.text}</p><div class="event-option">`;
        event.options.forEach((opt, i) => {
            if (opt.attr) {
                html += `<button onclick="game.triggerEventOption(${i})">${opt.text}</button>`;
            } else {
                html += `<button onclick="game.triggerEventSimple(${i})">${opt.text}</button>`;
            }
        });
        html += '</div>';
        this.openEventModal(html);
        // 保存当前事件到窗口方便选择
        window.currentEvent = event;
    },

    triggerEventOption: function(optIndex) {
        const event = window.currentEvent;
        const opt = event.options[optIndex];
        const attr = this.player[opt.attr];
        const success = this.checkRoll(attr.value, opt.diff);
        if (success) {
            this.gainReward(opt.successReward);
            this.addHistory(`[事件] ${event.title} - ${opt.successText}`);
            this.showNotice(opt.successText);
        } else {
            this.gainReward(opt.failReward);
            this.addHistory(`[事件] ${event.title} - ${opt.failText}`);
            this.showNotice(opt.failText);
        }
        this.renderAll();
        this.closeEventModal();
        delete window.currentEvent;
    },

    triggerEventSimple: function(optIndex) {
        const event = window.currentEvent;
        const opt = event.options[optIndex];
        this.gainReward(opt);
        this.addHistory(`[事件] ${event.title} - ${opt.text}`);
        this.showNotice(opt.successText);
        this.renderAll();
        this.closeEventModal();
        delete window.currentEvent;
    },

    gainReward: function(reward) {
        if (reward.money) this.resources.money += reward.money;
        if (reward.grain) this.resources.grain += reward.grain;
        if (reward.soldier) this.resources.soldier += reward.soldier;
    },

    // ========== 渲染 ==========
    renderAll: function() {
        this.renderOverview();
        this.renderFortress();
        this.renderAP();
        this.renderNpc();
    },

    renderOverview: function() {
        document.getElementById('yearText').textContent = this.date.year;
        document.getElementById('monthText').textContent = this.date.month;
        document.getElementById('forceText').textContent = this.player.force.value;
        document.getElementById('forceLevelText').textContent = this.player.force.level;
        document.getElementById('intelligenceText').textContent = this.player.intelligence.value;
        document.getElementById('intelligenceLevelText').textContent = this.player.intelligence.level;
        document.getElementById('charismaText').textContent = this.player.charisma.value;
        document.getElementById('charismaLevelText').textContent = this.player.charisma.level;
        document.getElementById('moneyText').textContent = this.resources.money.toLocaleString();
        document.getElementById('grainText').textContent = this.resources.grain.toLocaleString();
        document.getElementById('soldierText').textContent = this.resources.soldier.toLocaleString();

        // 离线
        const maxMonths = this.offlineAccumulation.maxAccumulateMonths;
        const current = this.offlineAccumulation.accumulatedMonths;
        const percent = (current / maxMonths) * 100;
        document.getElementById('offlineMonthsText').textContent = current.toString();
        document.getElementById('offlineMonthsBar').style.width = percent + '%';
        document.getElementById('claimOfflineResourcesBtn').disabled = current <= 0;

        // 升级按钮
        const canUpgrade = this.fortressLevel < this.fortressLevels.length;
        document.getElementById('upgradeFortressBtn').disabled = !canUpgrade;

        // 行动按钮
        document.getElementById('actionClearLand').disabled = this.actionPoints <= 0;
        document.getElementById('actionStudy').disabled = this.actionPoints <= 0;
    },

    renderFortress: function() {
        const f = this.currentFortress;
        document.getElementById('fortressLevelText').textContent = f.level;
        document.getElementById('fortressNameText').textContent = f.name;
        document.getElementById('fortressUpkeepText').textContent = f.upkeepGrain;
        document.getElementById('fortressYieldText').textContent = `${f.yieldGrain} 粮食, ${f.yieldMoney} 钱币`;

        // 检查能不能升级
        if (this.fortressLevel < this.fortressLevels.length) {
            const next = this.fortressLevels[this.fortressLevel];
            const can = this.resources.money >= next.costMoney && this.resources.grain >= next.costGrain;
            document.getElementById('upgradeFortressBtn').disabled = !can;
        }
    },

    renderAP: function() {
        document.getElementById('apText').textContent = `${this.actionPoints} / ${this.maxActionPoints}`;
        const percent = (this.actionPoints / this.maxActionPoints) * 100;
        document.getElementById('apBar').style.width = percent + '%';
    },

    renderNpc: function() {
        const container = document.getElementById('npcList');
        let html = '';
        for (let key in this.npcs) {
            const npc = this.npcs[key];
            html += `
                <div class="general-item kingdom-card ${npc.unlocked ? 'unlocked' : ''}">
                    <div>
                        <strong>${npc.name}</strong>
                        ${npc.unlocked ? `<br><small>羁绊已解锁</small>` : `<br><small>好感：${npc.affinity}/100</small>`}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    },

    // ========== 界面 ==========
    addHistory: function(text) {
        this.historyLog.push(text);
        const container = document.getElementById('historyLog');
        let html = '';
        // 反转显示最新在最上面
        this.historyLog.slice().reverse().forEach(line => {
            html += `<p>${line}</p>`;
        });
        container.innerHTML = html;
    },

    switchTab: function(tabId) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.tab:nth-child(${this.tabIndex(tabId) + 1})`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    },

    tabIndex: function(tabId) {
        const tabs = ['fortress', 'market', 'history'];
        return tabs.indexOf(tabId);
    },

    showNotice: function(text) {
        const noticeDiv = document.createElement('div');
        noticeDiv.textContent = text;
        noticeDiv.style.position = 'absolute';
        noticeDiv.style.left = '50%';
        noticeDiv.style.top = '20%';
        noticeDiv.style.transform = 'translate(-50%, -50%)';
        noticeDiv.style.fontSize = '20px';
        noticeDiv.style.fontWeight = 'bold';
        noticeDiv.style.color = '#ffdead';
        noticeDiv.style.background = 'rgba(0, 0, 0, 0.8)';
        noticeDiv.style.padding = '20px 30px';
        noticeDiv.style.borderRadius = '10px';
        noticeDiv.style.zIndex = '50';
        document.querySelector('.header-card').appendChild(noticeDiv);
        setTimeout(() => noticeDiv.remove(), 3000);
    },

    openSettings: function() {
        document.getElementById('settingsModal').classList.add('show');
    },

    closeSettings: function() {
        document.getElementById('settingsModal').classList.remove('show');
    },

    resetGame: function() {
        if (confirm('确定要重置游戏吗？所有进度会丢失。')) {
            localStorage.removeItem('threekingdom-caocao');
            location.reload();
        }
    },

    startLoop: function() {
        // 回合制手动，不需要自动循环
    }
};
