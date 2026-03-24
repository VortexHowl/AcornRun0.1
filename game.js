import Phaser from 'phaser';
import { Connection, PublicKey } from '@solana/web3.js';

// --- Web3 Constants ---
const ZEP_MINT_ADDRESS = '6o4MAKKTwdtni9o6NdiR5HgGC62pL6YmqDNBhoPmVray';
const STUDIO_WALLET = '24Ti8yNf29t4E1mJdzDkEyBCrMFggrqLLFkmDbLrLZxV';
const RPC_URL = 'https://api.mainnet-beta.solana.com'; // Standard public RPC
let userWallet = null;

// --- Web3 Helpers ---
async function connectWallet() {
    if (window.phantom?.solana?.isPhantom) {
        try {
            const resp = await window.phantom.solana.connect();
            userWallet = resp.publicKey.toString();
            document.getElementById('connect-wallet').innerText = "Connected";
            // In a full build, you'd use @solana/spl-token to fetch the exact ZEP balance here
            document.getElementById('zep-balance').innerText = "Checking..."; 
            console.log("Connected with Public Key:", userWallet);
        } catch (err) {
            console.error("User rejected request");
        }
    } else {
        alert("Please install Phantom Wallet!");
    }
}

async function sendZepForRevive() {
    // Note: Creating a raw SPL token transaction requires the user's Token Account addresses.
    // This is the framework for where that transaction goes.
    if (!userWallet) return alert("Connect wallet first!");
    console.log(`Simulating sending 10 ZEP from ${userWallet} to ${STUDIO_WALLET}`);
    alert("Transaction simulated! Reviving squirrel...");
    return true; // Assume success for MVP
}

// --- Phaser Game Scene ---
class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.score = 0;
        this.gameOver = false;
    }

    create() {
        // Setup Physics
        this.player = this.physics.add.sprite(100, 300, null).setTint(0x8B4513); // Brown Squirrel Box
        this.player.body.setSize(30, 30);
        this.player.setCollideWorldBounds(true);
        
        this.platforms = this.physics.add.group();
        this.physics.add.collider(this.player, this.platforms);

        // Inputs
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Initial Platform
        this.spawnPlatform(400, 500);

        // Score Text
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#00ffcc' });
    }

    update() {
        if (this.gameOver) return;

        // Auto-scroll logic (Gauntlet style)
        this.score += 1;
        this.scoreText.setText('Score: ' + Math.floor(this.score / 10));

        // Procedural Platform Generation
        if (Phaser.Math.Between(1, 100) > 95) {
            this.spawnPlatform(800, Phaser.Math.Between(200, 550));
        }

        // Move platforms left to simulate running right
        this.platforms.children.iterate((platform) => {
            if (platform) {
                platform.x -= 4;
                if (platform.x < -100) platform.destroy();
            }
        });

        // Squirrel Controls
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
        } else {
            this.player.setVelocityX(0);
        }

        // Jetpack! (Up arrow)
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
        }

        // Death Condition (falling off bottom)
        if (this.player.y > 600) {
            this.triggerGameOver();
        }
    }

    spawnPlatform(x, y) {
        let plat = this.platforms.create(x, y, null).setTint(0x00ff00); // Green platform
        plat.body.setSize(150, 20);
        plat.setImmovable(true);
        plat.body.allowGravity = false;
    }

    triggerGameOver() {
        this.gameOver = true;
        this.physics.pause();
        
        // Show HTML UI
        document.getElementById('ui-layer').classList.remove('hidden');
        document.getElementById('shop-panel').classList.add('hidden');
        document.getElementById('death-panel').classList.remove('hidden');
        document.getElementById('final-score').innerText = Math.floor(this.score / 10);
    }
}

// --- Phaser Config ---
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 600 }, debug: false }
    },
    scene: MainScene
};

const game = new Phaser.Game(config);

// --- UI Event Listeners ---
document.getElementById('connect-wallet').addEventListener('click', connectWallet);

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('ui-layer').classList.add('hidden');
    game.scene.scenes[0].scene.restart();
});

document.getElementById('revive-btn').addEventListener('click', async () => {
    const success = await sendZepForRevive();
    if (success) {
        document.getElementById('ui-layer').classList.add('hidden');
        game.scene.scenes[0].gameOver = false;
        game.scene.scenes[0].player.setPosition(100, 300);
        game.scene.scenes[0].player.setVelocityY(0);
        game.scene.scenes[0].physics.resume();
    }
});
