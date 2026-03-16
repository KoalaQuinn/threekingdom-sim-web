// 三国立志传：草莽英雄 - 纯JavaScript框架
// 新UI布局：顶部状态+中间地图+底部功能Tab
// 核心：乱世小人物成长，月为回合，开放无结局
// 事件系统支持Excel配置导出JSON

const game = {
    // === 基础数据 ===
    date: {
        year: 184,
        month: 1,
    },

    // 当前场景：玩家在 "zhuojun" 涿郡城内 / "world" 大地图
    currentScene: "zhuojun",

    // 涿郡城内地点列表
    cityLocations: [
        {
            id: "gate",
            name: "城门",
            desc: "出城进入大地图",
            action: () => game.enterWorldMap(),
        },
        {
            id: "gov",
            name: "郡府官署",
            desc: "接取徭役任务，获得金钱",
            action: () => game.showGovTask(),
        },
        {
            id: "tavern",
            name: "城门酒馆",
            desc: "打听消息，结交豪杰",
            action: () => game.enterTavern(),
        },
        {
            id: "market",
            name: "郡县市集",
            desc: "买卖粮食物资",
            action: () => game.showMarket(),
        },
        {
            id: "farm",
            name: "城外荒地",
            desc: "亲自开垦，获得粮食",
            action: () => game.actionClearLand(),
        },
        {
            id: "study",
            name: "自家书屋",
            desc: "闭门读书，增加智力",
            action: () => game.actionStudy(),
        },
        {
            id: "train",
            name: "校场练兵",
            desc: "习武练兵，增加武力统率",
            action: () => game.actionTrain(),
        },
        {
            id: "social",
            name: "乡野游走",
            desc: "结交豪杰，增加魅力",
            action: () => game.actionSocial(),
        },
    ],

    // 大地图城池
    worldCities: [
        {
            id: "zhuojun",
            name: "涿郡",
            level: "县城",
            description: "你的家乡，黄巾起兵的地方",
            enter: () => game.enterCity("zhuojun"),
        },
        {
            id: "guangyang",
            name: "广阳",
            level: "郡城",
            description: "幽州治所，较为繁华",
            enter: () => game.enterCity("guangyang"),
        },
        {
            id: "xiaopei",
            name: "小沛",
            level: "县城",
            description: "徐州边境小城",
            enter: () => game.enterCity("xiaopei"),
        },
    ],

    // 四大属性：武力/智力/魅力/统率
    player: {
        force:    {val: 40, lv: 1, exp: 0},
        intel:    {val: 40, lv: 1, exp: 0},
        charisma: {val: 40, lv: 1, exp: 0},
        command:  {val: 30, lv: 1, exp: 0},
    },

    // 四大资源：金钱/粮食/人口/士兵
    res: {
        money:  100,
        grain:  150,
        people: 50,
        soldier: 0,
    },

    // 领地等级定义
    fortDef: [
        {
            lv: 1,
            name: "破败草庐",
            costMoney: 0,
            costGrain: 0,
            upkeepGrain: 10, // 每月维护消耗
            yieldGrain: 15,  // 每月产出
            yieldMoney: 0,
            unlock: null,
        },
        {
            lv: 2,
            name: "乡间篱落",
            costMoney: 500,
            costGrain: 500,
            upkeepGrain: 30,
            yieldGrain: 60,
            yieldMoney: 10,
            unlock: "recruit", // 解锁募兵
        },
        {
            lv: 3,
            name: "坚固坞堡",
            costMoney: 2000,
            costGrain: 3000,
            upkeepGrain: 100,
            yieldGrain: 200,
            yieldMoney: 50,
            unlock: "defense", // 贼寇防御加成
        },
        {
            lv: 4,
            name: "乱世壁垒",
            costMoney: 5000,
            costGrain: 8000,
            upkeepGrain: 300,
            yieldGrain: 500,
            yieldMoney: 200,
            unlock: "refuge", // 流民投奔概率+
        },
        {
            lv: 5,
            name: "一郡之雄",
            costMoney: 20000,
            costGrain: 30000,
            upkeepGrain: 1000,
            yieldGrain: 2000,
            yieldMoney: 1000,
            unlock: "expand", // 可以扩张领地到县城
        }
    ],
    fortLv: 1,

    // 行动力，默认每月5点
    ap: 5,
    apMax: 5,

    // MVP NPC 配置，后续可扩展
    npcs: {
        liuBei:   {name: "刘备", affinity: 0, unlocked: false},
        zhangFei: {name: "张飞", affinity: 0, unlocked: false},
        huaTuo:   {name: "华佗", affinity: 0, unlocked: false},
    },

    // 历史日志
    log: ["184年 1月：黄巾起义爆发，天下大乱，你流落乡野..."],

    // 背包（MVP空着，后续扩展）
    backpack: [],

    // 离线积累
    offline: {
        months: 0,
        maxMonths: 12,
        lastUpdate: Date.now(),
    },

    // 当前打开的底部Tab
    currentBottomTab: "map",

    // 事件列表（后续可以导入JSON）
    events: [
        {
            event_id: "evt_001",
            trigger_type: "random",
            title: "黄巾残党过境",
            description: "一伙大约二十人的黄巾残党路过你的领地，要求你交纳保护费。",
            opt1_text: "【武力硬刚】 武力+士兵 > 80",
            opt1_attr: "force",
            opt1_diff: 80,
            opt1_success_text: "你击败了黄巾残党，缴获 150 钱",
            opt1_success_reward: JSON.stringify({money: 150, exp_force: 5}),
            opt1_fail_text: "你击退了黄巾，但被抢走一半粮食",
            opt1_fail_reward: JSON.stringify({grain: "Math.floor(game.res.grain / 2)"}),
            opt2_text: "【破财消灾】 交出 100 粮食，安全过关",
            opt2_success_text: "黄巾拿了粮食走了，你安全过关",
            opt2_success_reward: JSON.stringify({grain: -100}),
        },
        {
            event_id: "evt_002",
            trigger_type: "random",
            title: "流民求收留",
            description: "一群流民逃到你的坞堡外，请求收留，他们带着一点粮食。",
            opt1_text: "【收留】 魅力检定 > 50",
            opt1_attr: "charisma",
            opt1_diff: 50,
            opt1_success_text: "流民感谢你，留下 80 粮食和 10 人口投奔",
            opt1_success_reward: JSON.stringify({grain: 80, people: 10}),
            opt1_fail_text: "流民内乱抢了粮食跑了，你损失 30 粮食",
            opt1_fail_reward: JSON.stringify({grain: -30}),
            opt2_text: "【赶走】 关门不放走，安全",
            opt2_success_text: "你关上寨门，流民离开了",
            opt2_success_reward: JSON.stringify({}),
        }
    ],

    // === getter ===
    get currentFort() {
        return this.fortDef[this.fortLv - 1];
    },

    // === 初始化 ===
    init: function() {
        this.load();
        this.calcOffline();
        this.renderStatusBar();
        this.renderMapArea();
        this.renderBottomTab();
        this.checkDateEvents(); // 检查当前月份触发事件
    },

    // === 存档读档 ===
    save: function() {
        localStorage.setItem("sangoku-caocao", JSON.stringify({
            date: this.date,
            currentScene: this.currentScene,
            player: this.player,
            res: this.res,
            fortLv: this.fortLv,
            ap: this.ap,
            npcs: this.npcs,
            log: this.log,
            backpack: this.backpack,
            offline: this.offline,
        }));
    },

    load: function() {
        const save = localStorage.getItem("sangoku-caocao");
        if (save) {
            const data = JSON.parse(save);
            Object.assign(this, data);
        }
    },

    resetGame: function() {
        if (!confirm("确定要重置游戏吗？所有进度会丢失。")) return;
        localStorage.removeItem("sangoku-caocao");
        location.reload();
    },

    // === 离线计算 ===
    calcOffline: function() {
        const now = Date.now();
        const days = (now - this.offline.lastUpdate) / (1000 * 60 * 60 * 24);
        let months = Math.floor(days / 30);
        months = Math.min(months, this.offline.maxMonths - this.offline.months);
        if (months <= 0) return;
        this.offline.months += months;
        this.renderStatusBar();
    },

    claimOffline: function() {
        if (this.offline.months <= 0) return;
        const f = this.currentFort;
        for (let i = 0; i < this.offline.months; i++) {
            // 每月产出减去消耗
            const totalUpkeep = f.upkeepGrain + this.res.soldier;
            this.res.grain += (f.yieldGrain - totalUpkeep);
            this.res.money += f.yieldMoney;
        }
        this.offline.months = 0;
        this.offline.lastUpdate = Date.now();
        this.save();
        this.renderAll();
        this.notice(`领取了 ${this.offline.months} 个月产出！`);
    },

    // === 行动力 ===
    useAP: function() {
        if (this.ap <= 0) {
            this.notice("行动力已经用完，请结束本月！");
            return false;
        }
        this.ap--;
        this.renderStatusBar();
        this.save();
        return true;
    },

    // === 属性升级 ===
    checkAttrLevelUp: function(attr) {
        // attr: force/intel/charisma/command
        const needExp = this.player[attr].lv * 10;
        if (this.player[attr].exp >= needExp) {
            this.player[attr].exp -= needExp;
            this.player[attr].lv++;
            this.player[attr].val += 5;
            const name = attr === 'force' ? '武力' : attr === 'intel' ? '智力' : attr === 'charisma' ? '魅力' : '统率';
            this.notice(`${name} 升级！Lv.${this.player[attr].lv}`);
            this.renderStatusBar();
            return true;
        }
        return false;
    },

    // === 行动 ===
    // 1. 开垦荒地
    actionClearLand: function() {
        if (!this.useAP()) return;
        // 产量 = 基础 + 武力% + 人口%
        const base = 10;
        const gain = Math.floor(base * (1 + this.player.force.val / 100) * (1 + this.res.people / 200));
        this.res.grain += gain;
        this.player.force.exp += 5;
        this.checkAttrLevelUp('force');
        this.addLog(`你亲自开垦荒地，获得 ${gain} 粮食`);
        this.renderAll();
        this.renderMapArea();
    },

    // 2. 闭门读书
    actionStudy: function() {
        if (!this.useAP()) return;
        this.player.intel.exp += 10;
        this.checkAttrLevelUp('intel');
        this.addLog(`你闭门读书，智力经验 +10`);
        this.renderAll();
        this.renderMapArea();
    },

    // 3. 习武练兵
    actionTrain: function() {
        if (!this.useAP()) return;
        this.player.force.exp += 8;
        this.player.command.exp += 5;
        this.checkAttrLevelUp('force');
        this.checkAttrLevelUp('command');
        this.addLog(`你习武练兵，武力经验 +8，统率经验 +5`);
        this.renderAll();
        this.renderMapArea();
    },

    // 4. 结交豪杰
    actionSocial: function() {
        if (!this.useAP()) return;
        this.player.charisma.exp += 10;
        this.checkAttrLevelUp('charisma');
        this.addLog(`你游走乡野结交豪杰，魅力经验 +10`);
        this.renderAll();
        this.renderMapArea();
    },

    // 领地升级
    upgradeFortress: function() {
        if (this.fortLv >= this.fortDef.length) {
            this.notice("领地已经满级！");
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
        this.addLog(`领地升级 → ${def.name}`);
        this.save();
        this.renderAll();
        this.notice(`领地升级成功！${def.name}`);
    },

    // === 场景切换 ===
    enterWorldMap: function() {
        this.currentScene = "world";
        this.renderMapArea();
    },

    enterCity: function(cityId) {
        this.currentScene = cityId;
        this.renderMapArea();
    },

    // === 州郡街市 ===
    // 1. 官署
    showGovTask: function() {
        if (!this.useAP()) return;
        let html = `
            <h3>🏛️ 郡府徭役</h3>
            <p class="modal-text">郡守招收徭役，完成工程任务，按能力给俸禄。</p>
            <div class="modal-options">
                <button onclick="game.doGovTask()">接受任务（智力检定 > 50）</button>
            </div>
        `;
        this.openModal(html);
    },

    doGovTask: function() {
        const success = this.roll(this.player.intel.val, 50);
        if (success) {
            const money = 50 + Math.floor(this.player.intel.val * 1.5);
            this.res.money += money;
            this.player.intel.exp += 8;
            this.checkAttrLevelUp('intel');
            this.addLog(`完成郡府徭役，获得 ${money} 金钱`);
            this.closeModal();
            this.renderAll();
        } else {
            const money = 20;
            this.res.money += money;
            this.addLog(`徭役完成不佳，获得 ${money} 金钱`);
            this.closeModal();
            this.renderAll();
        }
    },

    // 2. 酒馆
    enterTavern: function() {
        if (!this.useAP()) return;
        // 50% 刷 NPC，50% 刷随机事件
        if (Math.random() < 0.5) {
            const candidates = Object.values(this.npcs).filter(n => !n.unlocked);
            if (candidates.length > 0) {
                // 随机一个未解锁 NPC
                const npc = candidates[Math.floor(Math.random() * candidates.length)];
                this.showNpcInvite(npc);
                return;
            }
        }
        // 随机事件
        this.triggerRandomEvent();
    },

    showNpcInvite: function(npc) {
        const html = `
            <h3>🍶 酒馆偶遇</h3>
            <p class="modal-text">你在酒馆喝酒，正好碰到 ${npc.name} 一人独坐，可以花钱请客增加好感。</p>
            <div class="modal-options">
                <button onclick="game.inviteNpc('${npc.name}')">请客喝酒 → 花费 30 钱，+10 好感</button>
            </div>
        `;
        this.openModal(html);
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
            this.addLog(`${name} 好感已满，解锁羁绊！`);
            this.notice(`${name} 羁绊解锁！`);
        } else {
            this.addLog(`请 ${name} 喝酒，好感 +10`);
        }
        this.closeModal();
        this.renderAll();
    },

    // 3. 市集
    showMarket: function() {
        if (!this.useAP()) return;
        const html = `
            <h3>🏪 郡县市集</h3>
            <p class="modal-text">固定价格买卖物资</p>
            <div class="modal-options">
                <button onclick="game.buyGrain(100)">买入 100 粮食 → 花费 50 钱</button>
                <button onclick="game.buyGrain(500)">买入 500 粮食 → 花费 250 钱</button>
                <button onclick="game.sellGrain(100)">卖出 100 粮食 → 得到 40 钱</button>
                <button onclick="game.sellGrain(500)">卖出 500 粮食 → 得到 200 钱</button>
                <button onclick="game.claimOffline()">领取离线积累资源</button>
            </div>
        `;
        this.openModal(html);
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
        this.closeModal();
        this.renderAll();
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
        this.closeModal();
        this.renderAll();
    },

    // === 检定系统 ===
    roll: function(attrVal, diff) {
        // 1d100 + 属性值 >= 难度 → 成功
        const roll = Math.floor(Math.random() * 100) + 1;
        return (roll + attrVal) >= diff;
    },

    // === 随机事件 ===
    triggerRandomEvent: function() {
        if (this.events.length === 0) {
            this.notice("暂无事件");
            return;
        }
        const ev = this.events[Math.floor(Math.random() * this.events.length)];
        this.openEventFromData(ev);
    },

    openEventFromData: function(ev) {
        let html = `
            <h3>${ev.title}</h3>
            <p class="modal-text">${ev.description}</p>
            <div class="modal-options">
        `;

        // 最多三个选项
        [1, 2, 3].forEach(i => {
            const text = ev[`opt${i}_text`];
            if (!text) return;
            html += `<button onclick="game.chooseEvent('${ev.event_id}', ${i})">${text}</button>`;
        });

        html += '</div>';
        // 保存当前事件
        window.currentEvent = ev;
        this.openModal(html);
    },

    chooseEvent: function(eventId, optIndex) {
        const ev = window.currentEvent;
        const attrKey = ev[`opt${optIndex}_attr`];
        const diff = ev[`opt${optIndex}_diff`];

        let success = true;
        if (attrKey && diff) {
            // 需要检定
            const attr = this.player[attrKey];
            success = this.roll(attr.val, diff);
        }

        if (success) {
            const rewardText = ev[`opt${optIndex}_success_text`];
            const rewardJson = ev[`opt${optIndex}_success_reward`];
            this.applyReward(JSON.parse(rewardJson));
            this.addLog(`[事件] ${ev.title} - ${rewardText}`);
            this.notice(rewardText);
        } else {
            const failText = ev[`opt${optIndex}_fail_text`];
            const failJson = ev[`opt${optIndex}_fail_reward`];
            this.applyReward(JSON.parse(failJson));
            this.addLog(`[事件] ${ev.title} - ${failText}`);
            this.notice(failText);
        }

        this.closeModal();
        this.renderAll();
        delete window.currentEvent;
    },

    applyReward: function(reward) {
        // 支持：money/grain/people/soldier
        // 支持 exp_force/exp_intel/exp_charisma/exp_command
        for (let key in reward) {
            let val = reward[key];
            // 支持简单表达式，floor(game.res.grain/2)
            if (typeof val === 'string' && val.includes('game')) {
                val = Math.floor(eval(val));
            }
            if (key.startsWith('exp_')) {
                const attr = key.replace('exp_', '');
                this.player[attr].exp += val;
                this.checkAttrLevelUp(attr);
            } else if (key in this.res) {
                this.res[key] += val;
            }
        }
    },

    // 检查日期触发事件
    checkDateEvents: function() {
        // 遍历所有事件找 date 类型触发
        this.events.forEach(ev => {
            if (ev.trigger_type === 'date') {
                const target = ev.trigger_date; // YYYY-MM
                const [y, m] = target.split('-').map(Number);
                if (this.date.year === y && this.date.month === m) {
                    // 触发这个事件
                    setTimeout(() => this.openEventFromData(ev), 500);
                }
            }
        });
    },

    // === 结束月份 ===
    endMonth: function() {
        // 结算：消耗+产出
        const f = this.currentFort;
        const totalUpkeep = f.upkeepGrain + this.res.soldier; // 士兵每人吃1粮食每月
        this.res.grain -= totalUpkeep;
        this.res.grain += f.yieldGrain;
        this.res.money += f.yieldMoney;

        // 检查饿死：粮食负数
        if (this.res.grain < 0) {
            this.gameOver();
            return;
        }

        // 推进月份
        this.date.month++;
        if (this.date.month > 12) {
            this.date.month = 1;
            this.date.year++;
        }

        // 添加日志
        this.addLog(`${this.date.year}年 ${this.date.month}月：回合结束`);

        // 重置行动力
        this.ap = this.apMax;
        this.offline.lastUpdate = Date.now();

        // 30%概率随机事件
        if (Math.random() < 0.3) {
            this.triggerRandomEvent();
        }

        // 检查日期事件
        this.checkDateEvents();

        this.save();
        this.renderAll();
        this.notice("新的一月开始了");
    },

    gameOver: function() {
        this.openModal(`
            <h2>💀 游戏结束</h2>
            <p class="modal-text">你没有粮食，最终饿死在了领地...</p>
            <p>终年 ${this.date.year} 年 ${this.date.month} 月</p>
            <div class="modal-options">
                <button onclick="location.reload()">重新开始</button>
            </div>
        `);
    },

    // === UI 渲染 ===
    renderAll: function() {
        this.renderStatusBar();
        this.renderBottomTab();
        this.renderMapArea();
    },

    // 顶部状态栏
    renderStatusBar: function() {
        document.getElementById('dateText').textContent = `${this.date.year}年 ${this.date.month}月`;
        document.getElementById('apText').textContent = `${this.ap}`;
        document.getElementById('apMaxText').textContent = `${this.apMax}`;
        document.getElementById('apBar').style.width = `${(this.ap / this.apMax) * 100}%`;

        // 属性
        document.getElementById('statForce').textContent = this.player.force.val;
        document.getElementById('statInt').textContent = this.player.intel.val;
        document.getElementById('statCha').textContent = this.player.charisma.val;
        document.getElementById('statCom').textContent = this.player.command.val;

        // 资源
        document.getElementById('resMoney').textContent = this.res.money.toLocaleString();
        document.getElementById('resGrain').textContent = this.res.grain.toLocaleString();
        document.getElementById('resPeople').textContent = this.res.people.toLocaleString();
        document.getElementById('resSoldier').textContent = this.res.soldier.toLocaleString();
    },

    // 中间地图区
    renderMapArea: function() {
        const container = document.getElementById('mapArea');
        if (this.currentBottomTab !== 'map') {
            // 如果不是地图Tab，显示对应内容
            this.renderNonMapTab(container);
            return;
        }

        if (this.currentScene === 'world') {
            // 大地图
            let html = `<div class="location-title">🗺️ 天下大势</div><div class="city-map">`;
            this.worldCities.forEach(city => {
                html += `
                    <div class="city-node" onclick="game.worldCities[${this.worldCities.findIndex(c => c.id === city.id)}].enter()">
                        <div class="city-name">${city.name}</div>
                        <div class="city-level">${city.level}</div>
                    </div>
                `;
            });
            html += '</div>';
            // 添加离线领取按钮
            if (this.offline.months > 0) {
                html += `
                    <div class="location-card" style="margin-top: 10px;">
                        <div class="location-name">💎 离线积累</div>
                        <div class="location-desc">已经积累 ${this.offline.months}/${this.offline.maxMonths} 个月，点击领取</div>
                        <button onclick="game.claimOffline()" style="width: 100%; margin-top: 8px;">领取资源</button>
                    </div>
                `;
            }
            container.innerHTML = html;
            return;
        } else {
            // 城内显示地点列表
            let html = `<div class="location-title">🏙️ ${this.getCurrentCityName()}</div><div class="location-grid">`;
            this.cityLocations.forEach(loc => {
                html += `
                    <div class="location-card" onclick="game.cityLocations[${this.cityLocations.findIndex(l => l.id === loc.id)}].action()">
                        <div class="location-name">${loc.name}</div>
                        <div class="location-desc">${loc.desc}</div>
                    </div>
                `;
            });
            html += '</div>';
            // 添加结束本月按钮
            html += `
                <div class="location-card" style="margin-top: 10px;">
                    <div class="location-name">📅 结束本月</div>
                    <div class="location-desc">结算本月产出消耗，进入下一月</div>
                    <button onclick="game.endMonth()" style="width: 100%; margin-top: 8px;">结束本月</button>
                </div>
            `;
            // 显示领地升级
            if (this.fortLv < this.fortDef.length) {
                const next = this.fortDef[this.fortLv];
                const can = this.res.money >= next.costMoney && this.res.grain >= next.costGrain;
                html += `
                    <div class="location-card" style="margin-top: 10px;">
                        <div class="location-name">🏰 升级领地</div>
                        <div class="location-desc">当前：${this.currentFort.name} → 下一级：${next.name}<br>消耗：${next.costMoney} 钱 ${next.costGrain} 粮</div>
                        <button onclick="game.upgradeFortress()" ${!can ? "disabled" : ""} style="width: 100%; margin-top: 8px;">升级领地</button>
                    </div>
                `;
            }

            container.innerHTML = html;
        }
    },

    getCurrentCityName: function() {
        if (this.currentScene === 'zhuojun') return "涿郡城内";
        const city = this.worldCities.find(c => c.id === this.currentScene);
        return city ? city.name : this.currentScene;
    },

    // 底部Tab切换
    switchBottomTab: function(tabId) {
        this.currentBottomTab = tabId;
        this.renderBottomTab();
        this.renderMapArea();
    },

    renderBottomTab: function() {
        document.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
        const tabs = ["map", "character", "backpack", "log", "npc"];
        tabs.forEach((tab, i) => {
            if (tab === this.currentBottomTab) {
                document.querySelectorAll('.bottom-tab')[i].classList.add('active');
            }
        });
    },

    renderNonMapTab: function(container) {
        if (this.currentBottomTab === 'character') {
            // 角色详细属性
            let html = `
                <h3>👤 角色信息</h3>
                <div class="attr-row">
                    <div class="attr-card">
                        <div class="attr-name">⚔️ 武力</div>
                        <div class="attr-value">${this.player.force.val}</div>
                        <div class="attr-exp">Lv.${this.player.force.lv} 经验: ${this.player.force.exp}/${this.player.force.lv * 10}</div>
                    </div>
                    <div class="attr-card">
                        <div class="attr-name">🧠 智力</div>
                        <div class="attr-value">${this.player.intel.val}</div>
                        <div class="attr-exp">Lv.${this.player.intel.lv} 经验: ${this.player.intel.exp}/${this.player.intel.lv * 10}</div>
                    </div>
                </div>
                <div class="attr-row">
                    <div class="attr-card">
                        <div class="attr-name">💬 魅力</div>
                        <div class="attr-value">${this.player.charisma.val}</div>
                        <div class="attr-exp">Lv.${this.player.charisma.lv} 经验: ${this.player.charisma.exp}/${this.player.charisma.lv * 10}</div>
                    </div>
                    <div class="attr-card">
                        <div class="attr-name">📋 统率</div>
                        <div class="attr-value">${this.player.command.val}</div>
                        <div class="attr-exp">Lv.${this.player.command.lv} 经验: ${this.player.command.exp}/${this.player.command.lv * 10}</div>
                    </div>
                </div>
                <div class="attr-row" style="margin-top: 15px;">
                    <div class="attr-card">
                        <div class="attr-name">🏰 领地</div>
                        <div class="attr-value">${this.currentFort.name}</div>
                        <div class="attr-exp">Lv.${this.currentFort.lv}</div>
                    </div>
                </div>
            `;
            container.innerHTML = html;
            return;
        }

        if (this.currentBottomTab === 'backpack') {
            if (this.backpack.length === 0) {
                container.innerHTML = `<div class="empty-tip">背包还是空的...</div>`;
            } else {
                let html = `<h3>🎒 背包</h3>`;
                this.backpack.forEach(item => {
                    html += `<div class="npc-item">
                        <div><strong>${item.name}</strong></div>
                        <div>x${item.count}</div>
                    </div>`;
                });
                container.innerHTML = html;
            }
            return;
        }

        if (this.currentBottomTab === 'log') {
            let html = `<h3>📜 经历日志</h3><div class="event-log">`;
            [...this.log].reverse().forEach(line => {
                html += `<p>${line}</p>`;
            });
            html += '</div>';
            container.innerHTML = html;
            return;
        }

        if (this.currentBottomTab === 'npc') {
            let html = `<h3>👥 NPC 羁绊</h3>`;
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
            return;
        }
    },

    addLog: function(text) {
        this.log.push(`${this.date.year}年 ${this.date.month}月：${text}`);
    },

    // === 弹窗 ===
    openModal: function(html) {
        document.getElementById('eventModalContent').innerHTML = html;
        document.getElementById('eventModal').classList.add('show');
    },

    closeModal: function() {
        document.getElementById('eventModal').classList.remove('show');
    },

    notice: function(text) {
        const n = document.createElement('div');
        n.className = 'notice';
        n.textContent = text;
        document.querySelector('.status-bar').appendChild(n);
        setTimeout(() => n.remove(), 3000);
    },

    openSettings: function() {
        document.getElementById('settingsModal').classList.add('show');
    },

    closeSettings: function() {
        document.getElementById('settingsModal').classList.remove('show');
    },
};
