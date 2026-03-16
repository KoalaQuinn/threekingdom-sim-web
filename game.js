// 三国模拟器 - 纯JavaScript网页版
// 魏蜀三国鼎立模拟器

const game = {
    // 游戏数据
    date: {
        year: 184,
        month: 1,
    },
    // 玩家国家（选择魏/蜀/吴）
    playerKingdom: null,
    // 资源
    resources: {
        grain: 10000,    // 粮食
        money: 5000,    // 金钱
        wood: 2000,     // 木材
        iron: 1000,     // 铁矿
    },
    population: 100000,  // 人口
    popularity: 70,      // 民心
    soldiers: 10000,     // 兵力

    // 三国
    kingdoms: {
        wei: {
            name: "魏",
            color: "#6495ed",
            emperor: "曹操",
            capital: "许昌",
            controlledCities: [],
            population: 0,
            generals: [],
            politics: 80,
        },
        shu: {
            name: "蜀",
            color: "#3cb371",
            emperor: "刘备",
            capital: "成都",
            controlledCities: [],
            population: 0,
            generals: [],
            politics: 75,
        },
        wu: {
            name: "吴",
            color: "#dc143c",
            emperor: "孙权",
            capital: "建业",
            controlledCities: [],
            population: 0,
            generals: [],
            politics: 78,
        },
    },

    // 城池列表
    cities: [
        {name: "许昌", owner: "wei", level: 5, defense: 500, population: 150000},
        {name: "洛阳", owner: "wei", level: 6, defense: 800, population: 200000},
        {name: "成都", owner: "shu", level: 5, defense: 600, population: 180000},
        {name: "汉中", owner: "shu", level: 4, defense: 400, population: 100000},
        {name: "建业", owner: "wu", level: 5, defense: 550, population: 160000},
        {name: "柴桑", owner: "wu", level: 4, defense: 350, population: 120000},
    ],

    // 武将（初始）
    generals: [
        // 魏国
        {name: "曹操", kingdom: "wei", level: 1, force: 98, intelligence: 96, politics: 94, loyalty: 100, alive: true},
        {name: "夏侯惇", kingdom: "wei", level: 1, force: 91, intelligence: 70, politics: 65, loyalty: 95, alive: true},
        {name: "郭嘉", kingdom: "wei", level: 1, force: 40, intelligence: 98, politics: 92, loyalty: 98, alive: true},
        // 蜀国
        {name: "刘备", kingdom: "shu", level: 1, force: 75, intelligence: 82, politics: 90, loyalty: 100, alive: true},
        {name: "关羽", kingdom: "shu", level: 1, force: 99, intelligence: 75, politics: 60, loyalty: 100, alive: true},
        {name: "张飞", kingdom: "shu", level: 1, force: 98, intelligence: 30, politics: 20, loyalty: 100, alive: true},
        {name: "诸葛亮", kingdom: "shu", level: 1, force: 30, intelligence: 100, politics: 98, loyalty: 100, alive: true},
        // 吴国
        {name: "孙权", kingdom: "wu", level: 1, force: 70, intelligence: 85, politics: 90, loyalty: 100, alive: true},
        {name: "周瑜", kingdom: "wu", level: 1, force: 70, intelligence: 97, politics: 90, loyalty: 98, alive: true},
        {name: "陆逊", kingdom: "wu", level: 1, force: 68, intelligence: 95, politics: 90, loyalty: 95, alive: true},
    ],

    // 战争
    wars: [],

    // 离线积累
    offlineAccumulation: {
        accumulatedMonths: 0,
        maxAccumulateMonths: 12,
        lastUpdate: Date.now(),
    },

    lastSaveTime: Date.now(),

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
        this.resources = {grain: 10000, money: 5000, wood: 2000, iron: 1000};
        this.population = 100000;
        this.popularity = 70;
        this.soldiers = 10000;
        this.offlineAccumulation = {accumulatedMonths: 0, maxAccumulateMonths: 12, lastUpdate: Date.now()};
        this.lastSaveTime = Date.now();
    },

    initDefaultData: function() {
        // 初始化城池归属
        this.cities.forEach(city => {
            if (this.kingdoms[city.owner]) {
                this.kingdoms[city.owner].controlledCities.push(city.name);
                this.kingdoms[city.owner].population += city.population;
            }
        });

        // 分配武将
        for (let k in this.kingdoms) {
            this.kingdoms[k].generals = this.generals
                .filter(g => g.kingdom === k && g.alive)
                .map(g => g.name);
        }
    },

    // ========== 存档加载 ==========
    save: function() {
        localStorage.setItem('threekingdom-sim', JSON.stringify({
            date: this.date,
            resources: this.resources,
            population: this.population,
            popularity: this.popularity,
            soldiers: this.soldiers,
            kingdoms: this.kingdoms,
            cities: this.cities,
            generals: this.generals,
            wars: this.wars,
            offlineAccumulation: this.offlineAccumulation,
            lastSaveTime: this.lastSaveTime,
        }));
    },

    load: function() {
        const saved = localStorage.getItem('threekingdom-sim');
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
        this.renderOverview();
    },

    // 领取离线积累
    claimOfflineResources: function() {
        if (this.offlineAccumulation.accumulatedMonths <= 0) return;

        // 每个月积累基础资源
        const months = this.offlineAccumulation.accumulatedMonths;
        this.resources.grain += Math.floor(this.population * 0.1 * months);
        this.resources.money += Math.floor(this.population * 0.05 * months);
        this.resources.wood += Math.floor(this.population * 0.01 * months);
        this.resources.iron += Math.floor(this.population * 0.005 * months);

        // 清空积累
        this.offlineAccumulation.accumulatedMonths = 0;
        this.offlineAccumulation.lastUpdate = Date.now();
        this.save();
        this.renderAll();
    },

    // ========== 回合 ==========
    nextMonth: function() {
        // 每个城市增长人口
        this.cities.forEach(city => {
            const growth = Math.floor(city.population * 0.01);
            city.population += growth;
            this.kingdoms[city.owner].population += growth;
        });

        // 总人口
        this.population = this.cities.reduce((sum, city) => sum + city.population, 0);

        // 资源产出
        this.cities.forEach(city => {
            if (city.owner === this.playerKingdom) {
                // 每个城市按等级产出
                const grainPerCity = city.level * 10 * city.population / 1000;
                const moneyPerCity = city.level * 5 * city.population / 1000;
                const woodPerCity = city.level * 2 * city.population / 1000;
                const ironPerCity = city.level * 1 * city.population / 2000;
                this.resources.grain += Math.floor(grainPerCity);
                this.resources.money += Math.floor(moneyPerCity);
                this.resources.wood += Math.floor(woodPerCity);
                this.resources.iron += Math.floor(ironPerCity);
            }
        });

        // 前进月份
        this.date.month++;
        if (this.date.month > 12) {
            this.date.month = 1;
            this.date.year++;
        }

        // AI 国家发展
        for (let k in this.kingdoms) {
            if (k !== this.playerKingdom) {
                // AI 每个月发展
                const aiPolitics = this.kingdoms[k].politics;
                const growth = Math.floor(this.kingdoms[k].population * (0.005 + aiPolitics / 10000));
                this.kingdoms[k].population += growth;
            }
        }

        // 更新离线积累时间
        this.offlineAccumulation.lastUpdate = Date.now();
        this.save();
        this.renderAll();
    },

    // ========== 渲染 ==========
    renderAll: function() {
        this.renderOverview();
        this.renderKingdomList();
        this.renderGeneralList();
        this.renderCityList();
        this.renderWarList();
    },

    renderOverview: function() {
        document.getElementById('yearText').textContent = this.date.year;
        document.getElementById('monthText').textContent = this.date.month;
        document.getElementById('popularityText').textContent = this.popularity;
        document.getElementById('grainText').textContent = this.resources.grain.toLocaleString();
        document.getElementById('moneyText').textContent = this.resources.money.toLocaleString();
        document.getElementById('woodText').textContent = this.resources.wood.toLocaleString();
        document.getElementById('ironText').textContent = this.resources.iron.toLocaleString();
        document.getElementById('populationText').textContent = this.population.toLocaleString();
        document.getElementById('soldierText').textContent = this.soldiers.toLocaleString();

        // 离线积累
        const maxMonths = this.offlineAccumulation.maxAccumulateMonths;
        const current = this.offlineAccumulation.accumulatedMonths;
        const percent = (current / maxMonths) * 100;
        document.getElementById('offlineMonthsText').textContent = current.toString();
        document.getElementById('offlineMonthsBar').style.width = percent + '%';
        document.getElementById('claimOfflineResourcesBtn').disabled = current <= 0;

        // 三国概况
        const container = document.getElementById('kingdomOverview');
        let html = '';
        for (let id in this.kingdoms) {
            const k = this.kingdoms[id];
            html += `
                <div class="kingdom-card ${id}">
                    <h3>${k.name} - ${k.emperor}</h3>
                    <p>都城：${k.capital} | 城池：${k.controlledCities.length} | 人口：${k.population.toLocaleString()}</p>
                    <p>武将：${k.generals.length} 人</p>
                </div>
            `;
        }
        container.innerHTML = html;
    },

    renderKingdomList: function() {
        const container = document.getElementById('kingdomList');
        let html = '';
        for (let id in this.kingdoms) {
            const k = this.kingdoms[id];
            html += `
                <div class="kingdom-card ${id}">
                    <h3>${k.name} - ${k.emperor}</h3>
                    <p>都城：${k.capital}</p>
                    <p>政治：${k.politics} | 城池：${k.controlledCities.length} | 人口：${k.population.toLocaleString()}</p>
                </div>
            `;
        }
        container.innerHTML = html;
    },

    renderGeneralList: function() {
        const container = document.getElementById('generalList');
        let html = '';
        this.generals.forEach(g => {
            if (!g.alive) return;
            const k = this.kingdoms[g.kingdom];
            html += `
                <div class="general-item kingdom-card ${g.kingdom}">
                    <div>
                        <strong>${g.name} Lv.${g.level}</strong> <small>[${k.name}]</small><br>
                        <small>武 ${g.force} | 智 ${g.intelligence} | 政 ${g.politics} | 忠 ${g.loyalty}</small>
                    </div>
                </div>
            `;
        });
        if (html === '') {
            html = '<p>暂无武将</p>';
        }
        container.innerHTML = html;
    },

    renderCityList: function() {
        const container = document.getElementById('cityList');
        let html = '';
        this.cities.forEach(city => {
            const k = this.kingdoms[city.owner];
            html += `
                <div class="city-item kingdom-card ${city.owner}">
                    <div>
                        <strong>${city.name}</strong> <small>[${k.name}]</small><br>
                        <small>等级 ${city.level} | 防御 ${city.defense} | 人口 ${city.population.toLocaleString()}</small>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    renderWarList: function() {
        const container = document.getElementById('warList');
        if (this.wars.length === 0) {
            container.innerHTML = '<p>目前没有正在进行的战争</p>';
            return;
        }
        let html = '';
        this.wars.forEach((war, index) => {
            const attacker = this.kingdoms[war.attacker];
            const defender = this.kingdoms[war.defender];
            const percent = (war.round / war.maxRound) * 100;
            html += `
                <div class="kingdom-card ${war.attacker}">
                    <h3>⚔️ ${attacker.name} 进攻 ${defender.name} ${war.city}</h3>
                    <p>回合：${war.round}/${war.maxRound}</p>
                    <div class="progress-bar ${war.attacker}">
                        <div class="progress-fill" style="width: ${percent}%"></div>
                    </div>
                    <p>攻击方兵力：${war.attackerSoldiers} | 防守方兵力：${war.defenderSoldiers}</p>
                    <button onclick="game.endWar(${index})" style="margin-top: 8px;">结束战争</button>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    // ========== 界面切换 ==========
    switchTab: function(tabId) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.tab:nth-child(${this.tabIndex(tabId) + 1})`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    },

    tabIndex: function(tabId) {
        const tabs = ['overview', 'kingdom', 'generals', 'cities', 'war'];
        return tabs.indexOf(tabId);
    },

    // ========== 设置 ==========
    openSettings: function() {
        document.getElementById('settingsModal').classList.add('show');
    },

    closeSettings: function() {
        document.getElementById('settingsModal').classList.remove('show');
    },

    resetGame: function() {
        if (confirm('确定要重置游戏吗？所有进度会丢失。')) {
            localStorage.removeItem('threekingdom-sim');
            location.reload();
        }
    },

    // ========== 战争 ==========
    endWar: function(index) {
        const war = this.wars[index];
        // 结算战争
        if (war.attackerSoldiers > war.defenderSoldiers) {
            // 攻方胜利，占领城池
            const city = this.cities.find(c => c.name === war.city);
            if (city) {
                // 从原国家移除
                const defenderKingdom = this.kingdoms[war.defender];
                defenderKingdom.controlledCities = defenderKingdom.controlledCities.filter(c => c !== war.city);
                // 加入攻方
                this.kingdoms[war.attacker].controlledCities.push(war.city);
                city.owner = war.attacker;
                this.showNotice(`${war.attacker.name} 攻破 ${war.city}，成功占领！`);
            }
        } else {
            this.showNotice(`进攻 ${war.city} 失败了`);
        }
        this.wars.splice(index, 1);
        this.save();
        this.renderAll();
    },

    showNotice: function(text) {
        const noticeDiv = document.createElement('div');
        noticeDiv.textContent = text;
        noticeDiv.style.position = 'absolute';
        noticeDiv.style.left = '50%';
        noticeDiv.style.top = '50%';
        noticeDiv.style.transform = 'translate(-50%, -50%)';
        noticeDiv.style.fontSize = '20px';
        noticeDiv.style.fontWeight = 'bold';
        noticeDiv.style.color = '#ffdead';
        noticeDiv.style.background = 'rgba(0, 0, 0, 0.8)';
        noticeDiv.style.padding = '20px 30px';
        noticeDiv.style.borderRadius = '10px';
        noticeDiv.style.zIndex = '50';
        noticeDiv.style.whiteSpace = 'pre-line';
        document.querySelector('.header-card').appendChild(noticeDiv);
        setTimeout(() => noticeDiv.remove(), 3000);
    },

    startLoop: function() {
        // 这里不需要自动循环，玩家手动点下个月
    }
};
