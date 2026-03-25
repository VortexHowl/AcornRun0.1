import './style.css';
import * as web3 from '@solana/web3.js';
import * as token from '@solana/spl-token';
import Phaser from 'phaser';
import { GameScene } from './game.js';

const ZEP_MINT = new web3.PublicKey("6o4MAKKTwdtni9o6NdiR5HgGC62pL6YmqDNBhoPmVray");
const STUDIO_WALLET = new web3.PublicKey("24Ti8yNf29t4E1mJdzDkEyBCrMFggrqLLFkmDbLrLZxV");
const connection = new web3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

let walletAddress = null;
let zepBalance = 0;

const connectBtn = document.getElementById('connect-wallet');
const zepDisplay = document.getElementById('zep-balance');

// Wallet Connection
async function connectWallet() {
    const provider = window?.phantom?.solana;
    if (provider?.isPhantom) {
        try {
            const resp = await provider.connect();
            walletAddress = resp.publicKey;
            connectBtn.innerText = walletAddress.toString().slice(0, 6) + '...';
            updateZepBalance();
        } catch (err) {
            console.error("User rejected the request.");
        }
    } else {
        window.open("https://phantom.app/", "_blank");
    }
}

async function updateZepBalance() {
    if (!walletAddress) return;
    try {
        const accounts = await connection.getParsedTokenAccountsByOwner(walletAddress, { mint: ZEP_MINT });
        if (accounts.value.length > 0) {
            zepBalance = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            zepDisplay.innerText = zepBalance.toLocaleString();
            updateShopAvailability();
        }
    } catch (e) { console.error("Error fetching ZEP balance", e); }
}

function updateShopAvailability() {
    document.getElementById('upg-speed').disabled = zepBalance < 100;
    document.getElementById('upg-damage').disabled = zepBalance < 500;
    document.getElementById('upg-fuel').disabled = zepBalance < 1000;
}

// Transaction logic for Revive
window.handleRevive = async () => {
    if (!walletAddress) return alert("Connect Wallet First!");
    const provider = window.phantom.solana;
    
    try {
        const fromTokenAccount = await token.getAssociatedTokenAddress(ZEP_MINT, walletAddress);
        const toTokenAccount = await token.getAssociatedTokenAddress(ZEP_MINT, STUDIO_WALLET);
        
        const transaction = new web3.Transaction().add(
            token.createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                walletAddress,
                10 * Math.pow(10, 9) // Assuming 9 decimals for ZEP
            )
        );

        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.feePayer = walletAddress;

        const { signature } = await provider.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

connectBtn.addEventListener('click', connectWallet);

// Phaser Game Config
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 800 }, debug: false }
    },
    scene: GameScene
};

const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.resize(window.innerWidth, window.innerHeight));
