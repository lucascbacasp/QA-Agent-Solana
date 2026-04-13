/**
 * Wallet Injector — Generates browser-injectable JavaScript that:
 *
 * 1. Injects a fake Phantom wallet on window.solana
 * 2. Loads @solana/web3.js + tweetnacl from CDN
 * 3. Patches the React WalletAdapter via fiber tree introspection
 * 4. Connects the wallet with a real PublicKey instance
 * 5. Overrides sendTransaction to sign + send with the QA keypair
 *
 * IMPORTANT LESSONS (from real testing on sol.metapool.app):
 * - The wallet adapter checks adapter._wallet (not just _connected)
 * - publicKey MUST be a real @solana/web3.js PublicKey (loaded from CDN)
 * - sendTransaction must be patched on BOTH adapter AND its prototype
 * - Use window.nacl (UMD) not dynamic import() (fails in eval context)
 * - Use Uint8Array for signatures, NOT Buffer (doesn't exist in browser)
 * - Legacy transactions may need recentBlockhash + feePayer injected
 */

export interface WalletInjectorConfig {
  publicKeyBase58: string;
  secretKeyArray: number[];
}

/**
 * Builds the STEP 1 script: inject window.solana with a Phantom-compatible mock.
 * Must run BEFORE the app hydrates (or immediately after navigation).
 */
export function buildStep1InjectWindowSolana(config: WalletInjectorConfig): string {
  return `
(function() {
  var PK = "${config.publicKeyBase58}";
  var SK_ARR = ${JSON.stringify(config.secretKeyArray)};
  function b58(str){var A='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';var r=0n;for(var c of str)r=r*58n+BigInt(A.indexOf(c));var b=[];while(r>0n){b.unshift(Number(r&0xFFn));r>>=8n;}while(b.length<32)b.unshift(0);return new Uint8Array(b);}
  var pkBytes = b58(PK);
  var mkPK = function(){return{toBase58:function(){return PK},toString:function(){return PK},toBuffer:function(){return pkBytes},toBytes:function(){return pkBytes},equals:function(o){return o&&o.toBase58&&o.toBase58()===PK}};};
  var w = {
    isPhantom:true, isConnected:false, publicKey:null, _events:{},
    connect:function(){this.isConnected=true;this.publicKey=mkPK();var s=this;if(s._events.connect)s._events.connect.forEach(function(fn){try{fn(s.publicKey)}catch(e){}});return Promise.resolve({publicKey:s.publicKey});},
    disconnect:function(){this.isConnected=false;this.publicKey=null;return Promise.resolve();},
    signTransaction:function(tx){return Promise.resolve(tx);},
    signAllTransactions:function(txs){return Promise.resolve(txs);},
    signAndSendTransaction:function(tx){return Promise.resolve({signature:'pending'});},
    signMessage:function(msg){return Promise.resolve({signature:new Uint8Array(64)});},
    on:function(e,fn){if(!this._events[e])this._events[e]=[];this._events[e].push(fn);return this;},
    off:function(e,fn){if(this._events[e])this._events[e]=this._events[e].filter(function(f){return f!==fn;});return this;},
    removeListener:function(e,fn){return this.off(e,fn);},
    removeAllListeners:function(e){if(e)delete this._events[e];else this._events={};return this;},
    emit:function(e){var a=[].slice.call(arguments,1);if(this._events[e])this._events[e].forEach(function(fn){fn.apply(null,a);});}
  };
  window.solana = w;
  window.phantom = { solana: w };
  console.log('[QA Wallet] Step 1: window.solana injected');
})();`.trim();
}

/**
 * Builds the STEP 2+3 script: load CDN deps, patch adapter, connect.
 * Must run AFTER the app has hydrated (React fiber tree is available).
 */
export function buildStep2PatchAndConnect(config: WalletInjectorConfig): string {
  return `
(function() {
  var PK = "${config.publicKeyBase58}";
  var SK_ARR = ${JSON.stringify(config.secretKeyArray)};

  // --- Load CDN dependencies ---
  function loadScript(url) {
    return new Promise(function(resolve, reject) {
      if (url.includes('web3') && window.solanaWeb3) return resolve();
      if (url.includes('nacl') && window.nacl) return resolve();
      var s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  Promise.all([
    loadScript('https://unpkg.com/@solana/web3.js@1.98.0/lib/index.iife.min.js'),
    loadScript('https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl-fast.min.js')
  ]).then(function() {
    console.log('[QA Wallet] Step 2: CDN deps loaded');

    // --- React fiber helpers ---
    function ff(dom) {
      var k = Object.keys(dom).find(function(k){return k.startsWith('__reactFiber$');});
      return k ? dom[k] : null;
    }
    function fc(f, key, d) {
      d = d || 0;
      if (!f || d > 100) return null;
      if (f.pendingProps && f.pendingProps.value && f.pendingProps.value[key]) return f.pendingProps.value;
      return fc(f.return, key, d + 1);
    }

    var root = document.getElementById('__next') || document.body.firstElementChild;
    var fiber = ff(root);
    if (!fiber) { console.error('[QA Wallet] React fiber not found'); return; }

    var walletCtx = fc(fiber, 'select');
    if (!walletCtx) { console.error('[QA Wallet] Wallet context not found'); return; }

    var connCtx = fc(fiber, 'connection');
    if (!connCtx) { console.error('[QA Wallet] Connection context not found'); return; }

    var connection = connCtx.connection;
    var PublicKey = window.solanaWeb3.PublicKey;
    var realPK = new PublicKey(PK);
    var SK = new Uint8Array(SK_ARR);

    // --- Find Phantom adapter ---
    var phantomWallet = walletCtx.wallets.find(function(w) {
      return w.adapter && w.adapter.name === 'Phantom';
    });
    if (!phantomWallet) { console.error('[QA Wallet] Phantom adapter not found'); return; }
    var adapter = phantomWallet.adapter;

    // --- Patch adapter internals ---
    adapter._wallet = window.solana;
    adapter._connected = true;
    adapter._publicKey = realPK;
    Object.defineProperty(adapter, 'readyState', { get: function(){return 'Installed';}, configurable: true });
    Object.defineProperty(adapter, 'publicKey', { get: function(){return realPK;}, configurable: true });
    Object.defineProperty(adapter, 'connected', { get: function(){return true;}, configurable: true });
    adapter.connect = function() { adapter.emit('connect', realPK); return Promise.resolve(); };

    // --- Override sendTransaction (the critical part) ---
    var sendTxImpl = function(tx, conn, options) {
      console.log('[QA Wallet] sendTransaction executing...');
      var useConn = conn || connection;
      var isVersioned = !tx.serializeMessage && tx.message && typeof tx.message.serialize === 'function';

      try {
        var msg, sig, rawTx, signaturePromise;

        if (!isVersioned) {
          // Legacy transaction
          if (!tx.recentBlockhash) {
            return useConn.getLatestBlockhash().then(function(bh) {
              tx.recentBlockhash = bh.blockhash;
              if (!tx.feePayer) tx.feePayer = realPK;
              msg = tx.serializeMessage();
              sig = window.nacl.sign.detached(msg, SK);
              tx.addSignature(realPK, new Uint8Array(sig));
              rawTx = tx.serialize();
              return useConn.sendRawTransaction(rawTx, { skipPreflight: false, maxRetries: 3 });
            }).then(function(signature) {
              console.log('[QA Wallet] TX SENT:', signature);
              return signature;
            });
          }
          if (!tx.feePayer) tx.feePayer = realPK;
          msg = tx.serializeMessage();
          sig = window.nacl.sign.detached(msg, SK);
          tx.addSignature(realPK, new Uint8Array(sig));
          rawTx = tx.serialize();
          return useConn.sendRawTransaction(rawTx, { skipPreflight: false, maxRetries: 3 }).then(function(signature) {
            console.log('[QA Wallet] TX SENT:', signature);
            return signature;
          });
        } else {
          // Versioned transaction
          msg = tx.message.serialize();
          sig = window.nacl.sign.detached(msg, SK);
          tx.addSignature(realPK.toBytes(), new Uint8Array(sig));
          rawTx = tx.serialize();
          return useConn.sendRawTransaction(rawTx, { skipPreflight: false, maxRetries: 3 }).then(function(signature) {
            console.log('[QA Wallet] TX SENT:', signature);
            return signature;
          });
        }
      } catch(e) {
        console.error('[QA Wallet] TX ERROR:', e.message);
        if (e.logs) e.logs.forEach(function(l){console.error('[QA Wallet]', l);});
        return Promise.reject(e);
      }
    };

    // Patch on adapter AND prototype (WalletProvider closure may reference either)
    adapter.sendTransaction = sendTxImpl;
    Object.getPrototypeOf(adapter).sendTransaction = sendTxImpl;

    // --- Emit readyState change, select, and connect ---
    adapter.emit('readyStateChange', 'Installed');
    walletCtx.select('Phantom');

    setTimeout(function() {
      walletCtx.connect().then(function() {
        console.log('[QA Wallet] Step 3: CONNECTED — publicKey:', walletCtx.publicKey && walletCtx.publicKey.toBase58());
        console.log('[QA Wallet] READY — sendTransaction patched with signing');
      }).catch(function(e) {
        console.error('[QA Wallet] Connect error:', e.message);
      });
    }, 500);
  }).catch(function(e) {
    console.error('[QA Wallet] CDN load error:', e.message || e);
  });
})();`.trim();
}

/**
 * Builds the complete injection script (Step 1 + Step 2+3 combined).
 * Use with a delay between steps or as a single script after page load.
 */
export function buildFullInjectionScript(config: WalletInjectorConfig): string {
  const step1 = buildStep1InjectWindowSolana(config);
  const step2 = buildStep2PatchAndConnect(config);

  return `
// === QA WALLET FULL INJECTION ===
// Step 1: Inject window.solana (Phantom mock)
${step1}

// Step 2+3: Load CDN deps, patch adapter, connect (after app hydrates)
${step2}
`.trim();
}
