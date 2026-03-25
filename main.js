import './style.css';
import Phaser from 'phaser';
import * as web3 from '@solana/web3.js';
import * as token from '@solana/spl-token';

// --- CONFIGURATION ---
const ZEP_MINT = "6o4MAKKTwdtni9o6NdiR5HgGC62pL6YmqDNBhoPmVray";
const STUDIO_WALLET = "24Ti8yNf29t4E1mJdzDkEyBCrMFggrqLLFkmDbLrLZxV";
const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

// --- SOLANA STATE ---
let wallet = null;
let zepBalance = 0;
const connection = new web3.Connection(RPC_ENDPOINT, "confirmed");

const connectBtn = document.getElementById('wallet-btn');
const zepDisplay = document.getElementById('zep-display');

async function checkBalance(publicKey) {
    try {
        const accounts = await connection.getParsedTokenAccountsByOwner(
            publicKey, 
            { mint: new web3.PublicKey(ZEP_MINT) }
        );
        if (accounts.value.length > 0) {
            zepBalance = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            zepDisplay.innerText = `${zepBalance.toLocaleString()} ZEP`;
            updateShopButtons();
        }
    } catch (e) { console.error("Balance fetch failed", e); }
}

function updateShopButtons() {
    document.getElementById('upg-speed').disabled = zepBalance < 500;
    document.getElementById('upg-damage').disabled = zepBalance < 1000;
    document.getElementById('upg-fuel').disabled = zepBalance < 2500;
}

connectBtn.addEventListener('click', async () => {
    const { solana } = window;
    if (solana?.isPhantom) {
        const response = await solana.connect();
        wallet = response.publicKey;
        connectBtn.innerText = wallet.toString().slice(0, 4) + '...' + wallet.toString().slice(-4);
        checkBalance(wallet);
    } else {
        window.open("https://phantom.app/", "_blank");
    }
});

// --- PHASER GAME LOGIC ---
class MainGame extends Phaser.Scene {
    constructor() {
        super('MainGame');
        this.score = 0;
        this.fuel = 100;
        this.maxFuel = 100;
        this.distance = 0;
        this.isPaused = false;
    }

    preload() {
        // Create procedural textures
        const createRect = (key, color) => {
            let graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(color, 1);
            graphics.fillRect(0, 0, 32, 32);
            graphics.generateTexture(key, 32, 32);
        };
        createRect('squirrel', 0xffcc00);
        createRect('rat', 0xbc13fe);
        createRect('bullet', 0x00f3ff);
        createRect('floor', 0x111122);
    }

    create() {
        this.setupPhysics();
        this.setupPlayer();
        this.setupParticles();
        this.setupWorld();
        
        this.cameras.main.setBackgroundColor('#0d0221');
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, -200, 0);
        
        this.input.keyboard.on('keydown-SPACE', () => this.shoot());
        
        // Shop UI close listener
        document.getElementById('close-shop').onclick = () => {
            document.getElementById('shop-ui').classList.add('hidden');
            this.scene.resume();
            this.isPaused = false;
        };
    }

    setupPhysics() {
        this.platforms = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image });
    }

    setupPlayer() {
        this.player = this.physics.add.sprite(100, 100, 'squirrel');
        this.player.setCollideWorldBounds(false);
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.overlap(this.player, this.enemies, () => this.onHitPlayer());
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    setupParticles() {
        this.jetpackTrail = this.add.particles(0, 0, 'bullet', {
            speed: 100,
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 400,
            on: false
        });
        this.jetpackTrail.startFollow(this.player, 0, 16);
    }

    setupWorld() {
        // Create initial floor
        for(let i = 0; i < 20; i++) {
            this.spawnPlatform(i * 64);
        }
    }

    spawnPlatform(x) {
        const floorY = window.innerHeight - 32;
        const block = this.platforms.create(x, floorY, 'floor').setScale(2).refreshBody();
        block.setTint(0x333355);
        
        // Random rat spawn
        if (Math.random() > 0.85 && x > 500) {
            const rat = this.enemies.create(x, floorY - 64, 'rat');
            rat.setVelocityX(-100);
            rat.setBounce(1, 0);
        }
    }

    shoot() {
        if (this.isPaused) return;
        const b = this.bullets.create(this.player.x + 20, this.player.y, 'bullet');
        b.body.allowGravity = false;
        b.setVelocityX(600);
        b.setTint(0x00f3ff);
        this.physics.add.overlap(b, this.enemies, (bullet, enemy) => {
            bullet.destroy();
            enemy.destroy();
            this.score += 100;
        });
    }

    update() {
        if (this.isPaused) return;

        // Movement
        if (this.cursors.right.isDown) this.player.setVelocityX(250);
        else if (this.cursors.left.isDown) this.player.setVelocityX(-250);
        else this.player.setVelocityX(0);

        // Jetpack
        if (this.cursors.up.isDown && this.fuel > 0) {
            this.player.setVelocityY(-350);
            this.fuel -= 0.5;
            this.jetpackTrail.on = true;
        } else {
            this.jetpackTrail.on = false;
        }

        // Regen Fuel on Ground
        if (this.player.body.touching.down) {
            this.fuel = Math.min(this.maxFuel, this.fuel + 1);
        }

        // Death logic
        if (this.player.y > window.innerHeight) this.onHitPlayer();

        // Infinite Scrolling
        if (this.player.x > this.distance) {
            this.distance = this.player.x + 400;
            this.spawnPlatform(this.distance);
            
            // Check for Level Segment (Shop trigger)
            if (Math.floor(this.player.x / 3000) > this.lastSegment) {
                this.triggerShop();
                this.lastSegment = Math.floor(this.player.x / 3000);
            }
        }
    }

    triggerShop() {
        this.isPaused = true;
        this.scene.pause();
        document.getElementById('shop-ui').classList.remove('hidden');
        if (wallet) checkBalance(wallet);
    }

    onHitPlayer() {
        this.isPaused = true;
        this.scene.pause();
        document.getElementById('death-ui').classList.remove('hidden');
        document.getElementById('final-score').innerText = `SCORE: ${this.score}`;
        
        document.getElementById('revive-btn').onclick = () => this.attemptRevive();
    }

    async attemptRevive() {
        if (!wallet) return alert("Connect Wallet First!");
        
        try {
            const provider = window.solana;
            const fromAta = await token.getAssociatedTokenAddress(new web3.PublicKey(ZEP_MINT), wallet);
            const toAta = await token.getAssociatedTokenAddress(new web3.PublicKey(ZEP_MINT), new web3.PublicKey(STUDIO_WALLET));
            
            const tx = new web3.Transaction().add(
                token.createTransferInstruction(
                    fromAta, toAta, wallet, 10 * Math.pow(10, 9) // Assuming 9 decimals
                )
            );
            
            const { signature } = await provider.signAndSendTransaction(tx);
            await connection.confirmTransaction(signature);
            
            // Success
            document.getElementById('death-ui').classList.add('hidden');
            this.player.y = 100;
            this.player.x -= 100;
            this.isPaused = false;
            this.scene.resume();
        } catch (e) {
            console.error(e);
            alert("Transaction Failed. Progress Wiped.");
            window.location.reload();
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1000 }, debug: false }
    },
    scene: MainGame
};

new Phaser.Game(config);
