const imageAssets = {
    player: new Image(),
    enemy: new Image(),
    boss: new Image()
};

imageAssets.player.src = "../assets/img/spaceship.png";
imageAssets.enemy.src = "../assets/img/enemy-spaceship.png";
imageAssets.boss.src = "../assets/img/boss-spaceship.png";

const backgroundMusic = new Audio("../assets/backgroundSound/background.mp3");
backgroundMusic.loop = true;

let sounds;

let isGameOver = false;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const startBtn = document.getElementById("startBtn");

let score = 0;

const explosions = [];

startBtn.addEventListener("click", () => {
    startBtn.style.display = "none";

    sounds = {
        shoot: new Audio("../assets/soundEffect/spaceshipShot.mp3"),
        explosionSound: new Audio("../assets/soundEffect/explosion.mp3"),
        bossExplode: new Audio("../assets/soundEffect/bossExplosion.mp3"),
        bossLaser: new Audio("../assets/soundEffect/laser.mp3")
    };

    for (let key in sounds) {
        sounds[key].load();
    }

    enableSound();

    backgroundMusic.volume = 0.5;
    backgroundMusic.play().catch(err => {
        console.warn("Không thể phát nhạc nền:", err);
    });

    startGame();
});

let animationId = null;

function startGame() {
    console.log("Game bắt đầu!");
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    animationId = requestAnimationFrame(gameLoop);
}

class Player {
    constructor(x, y, size, speed) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.health = 1000;
        this.maxHealth = 1000;
        this.charge = 0;
        this.maxCharge = 20;
        this.bullets = [];
        this.lastShot = 0;
        this.continuousShooting = false;
        this.continuousShootingEnd = 0;
        this.lastContinuousShot = 0;

    }

    draw(ctx) {
        ctx.drawImage(imageAssets.player, this.x, this.y, this.size, this.size);

        ctx.fillStyle = "red";
        ctx.fillRect(10, canvas.height - 20, 200 * (this.health / this.maxHealth), 10);

        ctx.fillStyle = "blue";
        ctx.fillRect(10, canvas.height - 35, 200 * (this.charge / this.maxCharge), 10);
    }

    update(keys, timestamp) {
        const moveLeft = keys["a"] && !keys["d"];
        const moveRight = keys["d"] && !keys["a"];
        const moveUp = keys["w"] && !keys["s"];
        const moveDown = keys["s"] && !keys["w"];

        if (moveLeft) this.x -= this.speed;
        if (moveRight) this.x += this.speed;
        if (moveUp) this.y -= this.speed;
        if (moveDown) this.y += this.speed;

        if (this.y < canvas.height / 2) this.y = canvas.height / 2;
        if (this.y + this.size > canvas.height) this.y = canvas.height - this.size;

        if (this.x < 0) this.x = 0;
        if (this.x + this.size > canvas.width) this.x = canvas.width - this.size;

        let shootCooldown = 500;

        if (difficulty === "hard"){
            shootCooldown = 300;
        }

        if (timestamp - this.lastShot > shootCooldown) {
            this.bullets.push({
                x: this.x + this.size / 2 - 2,
                y: this.y,
                width: 4,
                height: 10,
                damage: 50
            });
            this.lastShot = timestamp;
            sounds.shoot.currentTime = 0;
            sounds.shoot.play();
        }

        this.bullets.forEach(b => b.y -= 10);
        this.bullets = this.bullets.filter(b => b.y + b.height > 0);

        const now = Date.now();
        if (player.continuousShooting && now < player.continuousShootingEnd) {
            if (now - player.lastContinuousShot >= 250) {
                this.bullets.push({
                    x: this.x + this.size / 2 - 2,
                    y: this.y,
                    width: 4,
                    height: 10,
                    damage: 150
                });
                player.lastContinuousShot = now;
                sounds.shoot.currentTime = 0;
                sounds.shoot.play();
            }
        } else {
            player.continuousShooting = false;
        }
    }

    useChargeSkill() {
        if (this.charge >= this.maxCharge) {
            for (let i = -2; i <= 2; i++) {
                this.bullets.push({
                    x: this.x + this.size / 2 - 2 + i * 6,
                    y: this.y,
                    width: 4,
                    height: 10,
                    damage: 200
                });
            }

            this.charge = 0;
            sounds.shoot.currentTime = 0;
            sounds.shoot.play();
        }
    }

    drawBullets(ctx) {
        ctx.fillStyle = "yellow";
        this.bullets.forEach(b => {
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });
    }
}

class Enemy {
    constructor(x, y, size, speed, health, difficulty) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.health = health;
        this.difficulty = difficulty;
        this.bullets = [];
        this.lastShot = 0;
        this.shotCount = 0;
        this.cooldown = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(imageAssets.enemy, -this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }

    update(timestamp) {
        this.y += this.speed;

        if (this.y > canvas.height) this.health = 0;

        const rate = this.difficulty === "easy" ? 2000 :
            this.difficulty === "medium" ? 1000 : 500;

        const burstLimit = this.difficulty === "easy" ? Infinity :
            this.difficulty === "medium" ? 2 : 5;

        const burstPause = this.difficulty === "easy" ? 0 :
            this.difficulty === "medium" ? 2000 : 1500;

        if (!this.cooldown && timestamp - this.lastShot > rate) {
            this.bullets.push({
                x: this.x + this.size / 2 - 2,
                y: this.y + this.size,
                width: 4,
                height: 10,
                damage: 25
            });

            this.lastShot = timestamp;
            this.shotCount++;

            if (this.shotCount >= burstLimit) {
                this.shotCount = 0;
                this.cooldown = true;
                setTimeout(() => this.cooldown = false, burstPause);
            }
        }

        this.bullets.forEach(b => b.y += 5);
        this.bullets = this.bullets.filter(b => b.y < canvas.height);
    }

    drawBullets(ctx) {
        ctx.fillStyle = "red";
        this.bullets.forEach(b => {
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });
    }
}

class Boss {
    constructor(x, y, size, speed, health) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.health = health;
        this.maxHealth = health;
        this.bullets = [];
        this.laser = null;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(imageAssets.boss, -this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();

        ctx.fillStyle = "red";
        ctx.fillRect(canvas.width / 2 - 100, 10, 200 * (this.health / this.maxHealth), 10);
    }

    update(timestamp) {
        if (!this.laser){
            this.x += this.speed;
            if (this.x <= 0 || this.x + this.size >= canvas.width) this.speed *= -1;
        }

        if (!this.lastShot || timestamp - this.lastShot > 1000) {
            this.bullets.push({
                x: this.x + this.size / 2 - 2,
                y: this.y + this.size,
                width: 4,
                height: 12,
                damage: 50
            });
            this.lastShot = timestamp;
        }

        if (!this.lastLaser || timestamp - this.lastLaser > 5000) {
            sounds.bossLaser.currentTime = 0;
            sounds.bossLaser.play();
            this.fireLaser();
            this.lastLaser = timestamp;
        }

        if (this.laser) {
            this.laser.duration -= 16;
            if (this.laser.duration <= 0) this.laser = null;
        }

        this.bullets.forEach(b => b.y += 5);
        this.bullets = this.bullets.filter(b => b.y < canvas.height);
    }

    drawBullets(ctx) {
        ctx.fillStyle = "purple";
        this.bullets.forEach(b => {
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });
    }

    fireLaser() {
        const laserWidth = player.size * 2 / 3;
        this.laser = {
            x: this.x + this.size / 2 - laserWidth / 2,
            y: this.y + this.size,
            width: laserWidth,
            height: canvas.height - this.y,
            duration: 1000
        };
    }

    drawLaser(ctx) {
        if (this.laser) {
            ctx.fillStyle = "red";
            ctx.fillRect(this.laser.x, this.laser.y, this.laser.width, this.laser.height);
        }
    }
}

class Explosion {
    constructor(x, y, color = "orange", particleCount = 15) {
        this.particles = [];
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30,
                color
            });
        }
    }

    update() {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
        });

        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 2, 2);
        });
    }

    isDone() {
        return this.particles.length === 0;
    }
}

const keys = {};
document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    if (e.key === 'j' || e.key === 'J') {
        player.useChargeSkill();
    }

    if (e.key === 'k' || e.key === 'K') {
        if (!player.continuousShooting && player.charge >= player.maxCharge) {
            player.continuousShooting = true;
            player.continuousShootingEnd = Date.now() + 5000;
            player.lastContinuousShot = 0;
            player.charge = 0;
        }
    }
});
document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

const player = new Player(200, canvas.height - 60, 30, 4);

let difficulty = "easy";

const bgImg = new Image();
bgImg.src = "../assets/img/background.jpg";

function gameLoop(timestamp) {
    animationId = requestAnimationFrame(gameLoop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "right";
    ctx.fillText("Điểm: " + score, canvas.width - 10, 30);
    ctx.textAlign = "left";

    if (score >= 10000) difficulty = "hard";
    else if (score >= 5000) difficulty = "medium";
    else difficulty = "easy";

    player.update(keys, timestamp);
    player.draw(ctx);
    player.drawBullets(ctx);

    enemies.forEach(enemy => {
        enemy.update(timestamp);
        enemy.draw(ctx);
        enemy.drawBullets(ctx);
        enemy.bullets.forEach((bullet, bi) => {
            if (
                bullet.x < player.x + player.size &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.size &&
                bullet.y + bullet.height > player.y
            ) {
                player.health -= bullet.damage;
                enemy.bullets.splice(bi, 1);
            }
        });
    });

    enemies.forEach((enemy) => {
        player.bullets.forEach((bullet, bi) => {
            if (
                bullet.x < enemy.x + enemy.size &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.size &&
                bullet.y + bullet.height > enemy.y
            ) {
                enemy.health -= bullet.damage;
                let gainCharge = difficulty === "hard" ? 2 : 1;
                player.charge += gainCharge;
                if (player.charge > player.maxCharge) player.charge = player.maxCharge;
                player.bullets.splice(bi, 1);
            }
        });
    });

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].health <= 0) {
            explosions.push(new Explosion(enemies[i].x + enemies[i].size / 2, enemies[i].y + enemies[i].size / 2, "red"));
            sounds.explosionSound.currentTime = 0;
            sounds.explosionSound.play();
            enemies.splice(i, 1);
            score += 100;
        }
    }

    checkBossSpawn();

    if (boss) {
        boss.update(timestamp);
        boss.draw(ctx);
        boss.drawBullets(ctx);
        boss.drawLaser(ctx);

        player.bullets.forEach((bullet, bi) => {
            if (
                bullet.x < boss.x + boss.size &&
                bullet.x + bullet.width > boss.x &&
                bullet.y < boss.y + boss.size &&
                bullet.y + bullet.height > boss.y
            ) {
                boss.health -= bullet.damage;
                let gainCharge = difficulty === "hard" ? 2 : 1;
                player.charge += gainCharge;
                if (player.charge > player.maxCharge) player.charge = player.maxCharge;
                player.bullets.splice(bi, 1);
            }
        });

        boss.bullets.forEach((bullet, bi) => {
            if (
                bullet.x < player.x + player.size &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.size &&
                bullet.y + bullet.height > player.y
            ) {
                player.health -= bullet.damage;
                boss.bullets.splice(bi, 1);
            }
        });

        if (boss.laser) {
            const l = boss.laser;
            const isHit =
                player.x < l.x + l.width &&
                player.x + player.size > l.x &&
                player.y < l.y + l.height &&
                player.y + player.size > l.y;

            if (isHit) {
                player.health -= 2;
            }
        }

        if (boss.health <= 0) {
            explosions.push(new Explosion(boss.x + boss.size / 2, boss.y + boss.size / 2, "red", 30));
            sounds.bossExplode.currentTime = 0;
            sounds.bossExplode.play();
            boss = null;
            score += 1000;
            player.health = Math.min(player.health + 300, player.maxHealth);
        }
    }

    if (player.health <= 0 && !isGameOver) {
        sounds.explosionSound.currentTime = 0;
        sounds.explosionSound.play();
        isGameOver = true;

        const gameOverScreen = document.getElementById("gameOverScreen");
        const finalScore = document.getElementById("finalScore");
        finalScore.textContent = "Điểm của bạn: " + score;
        gameOverScreen.style.display = "flex";

        return;
    }

    explosions.forEach(e => {
        e.update();
        e.draw(ctx);
    });

    for (let i = explosions.length - 1; i >= 0; i--) {
        if (explosions[i].isDone()) explosions.splice(i, 1);
    }

}

const enemies = [];
let boss = null;

function spawnEnemy() {
    const x = Math.random() * (canvas.width - 30);
    const y = Math.random() * (canvas.height / 2 - 100);
    const size = 30;
    const speed = 1 + Math.random();
    const health = difficulty === "easy" ? 50 : difficulty === "medium" ? 100 : 150;

    enemies.push(new Enemy(x, y, size, speed, health, difficulty));
}

let lastBossSpawnScore = 0;

function checkBossSpawn() {
    if (score > 0 && score % 5000 === 0 && boss === null && score !== lastBossSpawnScore) {
        boss = new Boss(canvas.width / 2 - 50, 50, 100, 2, 2000);
        lastBossSpawnScore = score;
    }
}

setInterval(spawnEnemy, 2000);

function resetGame() {
    isGameOver = false;
    score = 0;
    difficulty = "easy";

    player.x = 200;
    player.y = canvas.height - 60;
    player.health = player.maxHealth;
    player.charge = 0;
    player.bullets = [];

    enemies.length = 0;
    boss = null;
    explosions.length = 0;

    document.getElementById("gameOverScreen").style.display = "none";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    startGame()
}

function enableSound() {
    Object.values(sounds).forEach(sound => {
        sound.volume = 0;
        sound.play().then(() => {
            sound.pause();
            sound.currentTime = 0;
            sound.volume = 1;
        }).catch(err => {
            console.warn("Không thể preload âm thanh:", err);
        });
    });
}
