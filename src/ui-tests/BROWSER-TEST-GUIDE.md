# Browser UI Test — Guía para Claude

## Flujo probado y funcionando (sol.metapool.app)

### Pre-requisitos
- Wallet QA fondeada con SOL + jitoSOL/mSOL
- Helius RPC configurado en `.env`

### Paso a paso en el browser

```
1. NAVIGATE → app URL
2. WAIT 3 seconds (app hydration)
3. EXECUTE Step 1 script (inject window.solana)
4. WAIT 3-4 seconds  
5. EXECUTE Step 2+3 script (CDN + adapter patch + connect)
6. WAIT 5 seconds
7. CHECK console → debe decir "[QA Wallet] READY"
8. CHECK header → debe mostrar wallet address (GxQY...b6b5)
9. CHECK balances → SOL, jitoSOL, mpSOL visibles
10. CLICK "Upgrade" o "Stake" button
11. WAIT 10 seconds
12. CHECK console → "[QA Wallet] TX SENT: <signature>"
13. VERIFY balances updated in UI
14. RUN `npm run ui-test <URL> verify` para cross-check on-chain
```

### Problemas conocidos y soluciones

| Problema | Causa | Solución |
|---|---|---|
| Wallet no aparece conectada | Script inyectado después de que React cacheó | Recargar y ejecutar Step 1 antes de hydration |
| Balances muestran 0 | publicKey no es instancia real de PublicKey | Step 2 carga web3.js del CDN para crear PublicKey real |
| WalletNotConnectedError | adapter._wallet es null | Step 2 setea adapter._wallet = window.solana |
| Buffer is not defined | Node.js Buffer no existe en browser | Usar Uint8Array para signatures |
| nacl.sign.detached undefined | import() dinámico falla en eval context | Cargar nacl-fast.min.js via script tag (UMD) |
| sendTransaction no se ejecuta | WalletProvider usa closure del adapter original | Patchear en adapter Y Object.getPrototypeOf(adapter) |
| TX recentBlockhash required | App construye TX sin blockhash | sendTransaction agrega blockhash automáticamente |

### Scripts generados por `npm run ui-test <URL>`

El comando genera dos scripts listos para ejecutar:
- **Step 1**: `buildStep1InjectWindowSolana()` — inyecta window.solana
- **Step 2+3**: `buildStep2PatchAndConnect()` — CDN + patch + connect
