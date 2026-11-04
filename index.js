/**
 * =====================================================================
 *  Make 10 (テンパズル) のプログラム
 *  高校生の人でも読めるように、各パートに説明コメントをつけています。
 *  上から順番に読んでいくと、ゲーム全体の流れがわかるようになっています。
 * =====================================================================
 */


/**
 * A. 効果音を鳴らすためのクラス
 * ------------------------------------------------------------
 * Web Audio API という「音を作る仕組み」を使って、
 * 音声ファイルを用意しなくても「ピコン」のような音を鳴らせるようにしている。
 */
class SoundFX {
    constructor() {
        this.ctx = null;       // 音を鳴らすための「音声コンテキスト」（最初は空っぽ）
        this.enabled = true;   // 効果音ON/OFFのスイッチ（trueなら鳴らす）
    }

    // 音声コンテキストの準備（ボタンなどが押された最初のタイミングで作る）
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        // ★追加: スマホ(iPhoneなど)では、音声コンテキストが「停止中」で始まることがあるので、再開させておく
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    // 指定した「音の高さ（freq）」「長さ（duration）」で音を1つ鳴らす関数
    playTone(freq, duration, type = 'sine', gainVal = 0.13) {
        if (!this.enabled) return; // OFFなら何もしない
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator(); // 音の「発生源」
            const gain = this.ctx.createGain();       // 音の「大きさ」を調整する部品
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration); // だんだん音を小さくする
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { /* 音が鳴らせない環境でもエラーで止まらないようにする */ }
    }

    // それぞれの場面で鳴らす音を、わかりやすい名前の関数にまとめている
    // ★変更: 音の大きさ（最後の数字）を、以前の約1.6倍に大きくした
    playSelect() { this.playTone(600, 0.06, 'sine', 0.10); }    // カードを選んだ時
    playOp() { this.playTone(450, 0.08, 'triangle', 0.13); }    // 演算子を選んだ時
    playMerge() { this.playTone(850, 0.1, 'sine', 0.16); }      // 数字を計算した時
    playUndo() { this.playTone(300, 0.08, 'sawtooth', 0.08); }  // 1手戻した時
    playSuccess() {                                              // 「10」が完成した時（3音のファンファーレ）
        if (!this.enabled) return;
        this.init();
        this.playTone(523.25, 0.1, 'sine', 0.16);
        setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.16), 80);
        setTimeout(() => this.playTone(783.99, 0.1, 'sine', 0.16), 160);
        setTimeout(() => this.playTone(1046.50, 0.3, 'sine', 0.19), 240);
    }
}

const sound = new SoundFX();


/**
 * B. クリア時の紙吹雪（Confetti）エフェクトを管理するクラス
 * ------------------------------------------------------------
 * 画面全体に敷いた <canvas> というお絵かき用の領域に、
 * 小さな四角（紙吹雪）をたくさん降らせるアニメーションを作っている。
 */
class ConfettiManager {
    constructor() {
        this.canvas = document.getElementById('confetti-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];   // 紙吹雪の粒（つぶ）を入れておく配列
        this.animating = false;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // 画面サイズが変わってもキャンバスがぴったり合うようにする
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // 紙吹雪を画面中央から一気に飛び散らせる
    explode() {
        const colors = ['#38bdf8', '#818cf8', '#f43f5e', '#fbbf24', '#34d399', '#c084fc'];
        this.particles = [];
        for (let i = 0; i < 90; i++) {
            this.particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 20,  // 横方向の速さ（ランダム）
                vy: (Math.random() - 0.7) * 20,  // 縦方向の速さ（ランダム）
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.2,
                life: 1 // 1→0に減っていき、0になったら消える
            });
        }
        if (!this.animating) {
            this.animating = true;
            this.loop();
        }
    }

    // 毎フレーム（パラパラ漫画のコマのように）粒の位置を更新して描き直す
    loop() {
        if (!this.animating) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let alive = false;
        for (let p of this.particles) {
            if (p.life <= 0) continue;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.4;        // 重力（だんだん下に落ちていく）
            p.life -= 0.018;    // 少しずつ薄くなって消える
            p.rotation += p.vRot;

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
        }
        if (alive) {
            requestAnimationFrame(() => this.loop()); // 生きている粒があれば次のフレームへ
        } else {
            this.animating = false;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

const confetti = new ConfettiManager();


/**
 * C. 「10パズル」を計算するエンジン（頭脳の部分）
 * ------------------------------------------------------------
 * 4つの数字と四則演算（＋－×÷）を組み合わせて「10」になる問題だけを
 * 出題できるように、あらかじめ答えがある組み合わせだけを集めておく。
 */
/**
 * ★追加: むずかしさの設定
 * ------------------------------------------------------------
 * 「10」の作り方（解の数）が多いほどかんたん、少ないほどむずかしい、という考え方で分けている。
 *   かんたん:   0を含まず、作り方が30通り以上ある問題（いろいろな方法で10が作れる）
 *   ふつう:     作り方が7〜29通りの問題
 *   むずかしい: 作り方が6通り以下の問題（正解の道すじが少なく、見つけにくい）
 * p.nums は4つの数字、p.solutions は「10になる式」の一覧
 */
const DIFFICULTY_RULES = {
    easy:   { label: 'かんたん',   test: p => !p.nums.includes(0) && p.solutions.length >= 30 },
    normal: { label: 'ふつう',     test: p => p.solutions.length >= 7 && p.solutions.length <= 29 },
    hard:   { label: 'むずかしい', test: p => p.solutions.length <= 6 }
};

// ★追加: むずかしさの表示名（「ランダム」は、3つのむずかしさをまぜて出題する）
const DIFFICULTY_LABELS = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい', random: 'ランダム' };

class Make10Engine {
    // 2つの数字(x, y)を演算子(op)で計算する、一番基本の計算関数
    static calc(x, op, y) {
        if (x === null || y === null) return null;
        if (op === '+') return x + y;
        if (op === '-') return x - y;
        if (op === '*') return x * y;
        if (op === '/') {
            if (Math.abs(y) <= 0.000001) return null; // 0で割り算はしない
            // ★追加: 割り切れない（答えが小数になる）場合は計算できないようにする
            if (Math.abs(x % y) > 0.000001) return null;
            return x / y;
        }
        return null;
    }

    // 4つの数字の「並び順」と「演算子の組み合わせ」を全部試して、
    // 答えが10になるものだけを集めて返す関数
    static findSolutions(digits) {
        const results = new Set(); // Setを使うと同じ答えが重複して入らない
        const ops = ['+', '-', '*', '/'];

        // 配列の並び替え（順列）を全部作る関数
        function permute(arr) {
            if (arr.length <= 1) return [arr];
            let res = [];
            for (let i = 0; i < arr.length; i++) {
                let cur = arr[i];
                let rem = arr.slice(0, i).concat(arr.slice(i + 1));
                for (let p of permute(rem)) res.push([cur].concat(p));
            }
            return res;
        }

        // 4つの数字の並び替え(a,b,c,e)ごとに、3つの演算子(op1,op2,op3)の
        // 全部の組み合わせを試して、計算の順番（カッコの付け方）も3パターン試す
        for (let d of permute(digits)) {
            const [a, b, c, e] = d;
            for (let op1 of ops) {
                for (let op2 of ops) {
                    for (let op3 of ops) {
                        // パターン1: ((a op1 b) op2 c) op3 e
                        const v1 = Make10Engine.calc(Make10Engine.calc(Make10Engine.calc(a, op1, b), op2, c), op3, e);
                        if (v1 !== null && Math.abs(v1 - 10) < 0.00001) {
                            results.add(`(( ${a} ${op1} ${b} ) ${op2} ${c}) ${op3} ${e}`.replace(/\*/g, '×').replace(/\//g, '÷'));
                        }
                        // パターン2: (a op1 (b op2 c)) op3 e
                        const v2 = Make10Engine.calc(Make10Engine.calc(a, op1, Make10Engine.calc(b, op2, c)), op3, e);
                        if (v2 !== null && Math.abs(v2 - 10) < 0.00001) {
                            results.add(`( ${a} ${op1} ( ${b} ${op2} ${c} )) ${op3} ${e}`.replace(/\*/g, '×').replace(/\//g, '÷'));
                        }
                        // パターン3: (a op1 b) op2 (c op3 e)
                        const v3 = Make10Engine.calc(Make10Engine.calc(a, op1, b), op2, Make10Engine.calc(c, op3, e));
                        if (v3 !== null && Math.abs(v3 - 10) < 0.00001) {
                            results.add(`( ${a} ${op1} ${b} ) ${op2} ( ${c} ${op3} ${e} )`.replace(/\*/g, '×').replace(/\//g, '÷'));
                        }
                    }
                }
            }
        }
        return Array.from(results);
    }

    // 0〜9の数字を4つ選ぶ組み合わせのうち、「10が作れるもの」だけを
    // あらかじめ全部探して pool（問題のストック）に貯めておく
    // ※この処理は少し時間がかかるので、ゲーム開始時に1回だけ実行する
    static initPool() {
        if (Make10Engine.pool && Make10Engine.pool.length > 0) return; // 2回計算しないようにする
        const pool = [];
        for (let a = 0; a <= 9; a++) {
            for (let b = a; b <= 9; b++) {
                for (let c = b; c <= 9; c++) {
                    for (let d = c; d <= 9; d++) {
                        const digits = [a, b, c, d];
                        const sols = Make10Engine.findSolutions(digits);
                        if (sols.length > 0) { // 答えが見つかった組み合わせだけ保存する
                            pool.push({ nums: digits, solutions: sols });
                        }
                    }
                }
            }
        }
        Make10Engine.pool = pool;
    }

    // ★追加: 今ある数字カードから「10」を作る手順を探す（ヒント用）
    // 見つかったら [{a, op, b, res}, ...]（1手ずつの計算）の配列を返す。作れないときは null を返す。
    // すでに10が1枚だけなら、空の配列 [] を返す。
    // まず「途中でマイナスの数が出ない手順」を探し、なければマイナスも許して探し直す（わかりやすい手順を優先するため）
    static solveSteps(cards) {
        const ops = ['+', '-', '*', '/'];

        function search(list, allowNegative) {
            if (list.length === 1) {
                return Math.abs(list[0] - 10) < 0.00001 ? [] : null;
            }
            // 2枚を選んで計算し、1枚にまとめたものでもう一度探す（これを繰り返す）
            for (let i = 0; i < list.length; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    const rest = list.filter((_, k) => k !== i && k !== j);
                    const orders = [[list[i], list[j]], [list[j], list[i]]];
                    for (let o = 0; o < orders.length; o++) {
                        const x = orders[o][0], y = orders[o][1];
                        for (const op of ops) {
                            if (o === 1 && (op === '+' || op === '*')) continue; // 足し算・かけ算は順番を逆にしても同じ
                            const res = Make10Engine.calc(x, op, y);
                            if (res === null) continue;
                            if (!allowNegative && res < 0) continue;
                            const sub = search(rest.concat([res]), allowNegative);
                            if (sub) return [{ a: x, op: op, b: y, res: res }].concat(sub);
                        }
                    }
                }
            }
            return null;
        }

        return search(cards, false) || search(cards, true);
    }

    // ★追加: 1手分の計算を「3 × 4 = 12」のような文字にする
    static formatStep(step) {
        const symbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[step.op];
        return `${step.a} ${symbol} ${step.b} = ${step.res}`;
    }

    // 問題のストック(pool)からランダムに1問取り出す（数字はシャッフルして返す）
    // ★変更: むずかしさ(difficulty)に合う問題だけから選ぶようにした
    static getRandomPuzzle(difficulty = GameState.difficulty) {
        Make10Engine.initPool();

        // むずかしさごとの問題リストを、最初の1回だけ作っておく
        if (!Make10Engine.subPools) {
            Make10Engine.subPools = {};
            Object.keys(DIFFICULTY_RULES).forEach(key => {
                Make10Engine.subPools[key] = Make10Engine.pool.filter(DIFFICULTY_RULES[key].test);
            });
        }
        // 「ランダム」のときは、まず3つのむずかしさからどれかを同じ確率で選び、その中から1問出す
        if (difficulty === 'random') {
            const keys = Object.keys(DIFFICULTY_RULES);
            difficulty = keys[Math.floor(Math.random() * keys.length)];
        }
        const list = (Make10Engine.subPools[difficulty] && Make10Engine.subPools[difficulty].length > 0)
            ? Make10Engine.subPools[difficulty]
            : Make10Engine.pool; // 念のため、空だったら全部の問題から選ぶ

        const p = list[Math.floor(Math.random() * list.length)];
        const shuffled = [...p.nums].sort(() => Math.random() - 0.5);
        return { nums: shuffled, solutions: p.solutions };
    }
}


/**
 * D. ★追加: 記録（累計正解数・タイムアタックの自己ベスト）を保存する仕組み
 * ------------------------------------------------------------
 * ブラウザには localStorage という「ページを閉じても消えないメモ帳」がある。
 * ここに数字を書き込んでおくことで、リロード（再読み込み）しても記録が消えなくなる。
 */
const StatsManager = {
    KEY_TOTAL: 'make10_totalCorrect',     // 累計正解数を保存するときの「名前」
    KEY_TA_BEST: 'make10_timeAttackBest', // タイムアタック自己ベスト（60秒）を保存するときの「名前」
    KEY_TA_DURATION: 'make10_taDuration', // ★追加: 最後に選んだタイムアタックの時間を保存するときの「名前」
    KEY_FASTEST: 'make10_fastestTime',    // 最速クリアタイムを保存するときの「名前」
    KEY_BEST_STREAK: 'make10_bestStreak', // 連続正解記録（コンボ）を保存するときの「名前」

    // 累計正解数を読み込む（まだ記録がなければ 0 を返す）
    getTotalCorrect() {
        const saved = localStorage.getItem(this.KEY_TOTAL);
        return saved ? parseInt(saved, 10) : 0;
    },

    // ★追加: 時間（秒）ごとに別々の名前で保存する（30秒・1分・2分・3分で記録を分けるため）
    // 60秒は、これまでの記録がそのまま使えるように、元の名前のままにしている
    taKey(seconds) {
        return seconds === 60 ? this.KEY_TA_BEST : `${this.KEY_TA_BEST}_${seconds}`;
    },

    // タイムアタックの自己ベストを読み込む（まだ記録がなければ 0 を返す）
    // seconds を省略したら、今選んでいる時間の記録を返す
    getTimeAttackBest(seconds = GameState.timeAttackDuration) {
        const saved = localStorage.getItem(this.taKey(seconds));
        return saved ? parseInt(saved, 10) : 0;
    },

    // 最速クリアタイム（秒）を読み込む（まだ記録がなければ null を返す）
    getFastestTime() {
        const saved = localStorage.getItem(this.KEY_FASTEST);
        return saved ? parseFloat(saved) : null;
    },

    // 連続正解記録（コンボ）の自己ベストを読み込む（まだ記録がなければ 0 を返す）
    getBestStreak() {
        const saved = localStorage.getItem(this.KEY_BEST_STREAK);
        return saved ? parseInt(saved, 10) : 0;
    },

    // 「10」が1問完成するたびに呼び出す。累計正解数を+1して保存する
    addCorrect() {
        const newTotal = this.getTotalCorrect() + 1;
        localStorage.setItem(this.KEY_TOTAL, String(newTotal));
        return newTotal;
    },

    // タイムアタックが終わったときに呼び出す。
    // 今回のスコアが自己ベストより高ければ、上書き保存して true を返す
    updateTimeAttackBest(score, seconds = GameState.timeAttackDuration) {
        const best = this.getTimeAttackBest(seconds);
        if (score > best) {
            localStorage.setItem(this.taKey(seconds), String(score));
            return true;  // 自己ベストを更新した
        }
        return false; // 更新はなかった
    },

    // 1問クリアするたびに呼び出す。かかった秒数(seconds)が今までより速ければ上書き保存して true を返す
    updateFastestTime(seconds) {
        const best = this.getFastestTime();
        if (best === null || seconds < best) {
            localStorage.setItem(this.KEY_FASTEST, String(seconds));
            return true; // 最速記録を更新した
        }
        return false;
    },

    // 連続正解数(streak)が今までの自己ベストより多ければ上書き保存して true を返す
    updateBestStreak(streak) {
        const best = this.getBestStreak();
        if (streak > best) {
            localStorage.setItem(this.KEY_BEST_STREAK, String(streak));
            return true; // コンボの自己ベストを更新した
        }
        return false;
    }
};


/**
 * E. ゲーム中の状態（変数）をまとめて管理する場所
 * ------------------------------------------------------------
 * バラバラの変数をあちこちに置くと分かりにくいので、
 * 1つの「GameState」というオブジェクトにまとめている。
 */
const GameState = {
    mode: 'endless', // 今のモード: 'endless'（エンドレス） または 'time'（タイムアタック）
    currentPuzzle: { nums: [], solutions: [] },

    cards: [],            // 今、盤面に並んでいる数字カードの配列
    history: [],          // 「1手戻す」機能のために、計算前の状態を記録しておく配列

    selectedCardIdx1: null, // 1枚目に選んだカードの位置（番号）
    selectedOp: null,       // 選んだ演算子 ('+', '-', '*', '/')

    score: 0,                 // 今のプレイでの正解数
    timerInterval: null,      // タイムアタックのタイマー（setIntervalのID）
    timeAttackRemaining: 60,  // タイムアタックの残り秒数
    timeAttackDuration: parseInt(localStorage.getItem('make10_taDuration'), 10) || 60, // ★追加: 選んだ時間（秒）。30 / 60 / 120 / 180 のどれか
    isSolved: false,          // 今の問題が解けた直後かどうか

    puzzleStartTime: null,    // ★追加: 今の問題を出題した時刻（最速クリアタイムの計算に使う）
    currentStreak: 0,         // ★追加: 今、何問連続で正解しているか（パスすると0に戻る）

    // ★追加: むずかしさ（'easy' / 'normal' / 'hard'）。前回選んだものを覚えておく
    difficulty: (() => {
        const saved = localStorage.getItem('make10_difficulty');
        return DIFFICULTY_LABELS[saved] ? saved : 'normal';
    })(),
    difficultyLocked: false,  // ★追加: タイムアタック中・対戦中は、むずかしさを変えられないようにする
    puzzleToken: 0,           // ★追加: 問題が切り替わるたびに増やす番号（アニメーション待ちの途中で問題が変わった時の見分け用）
    isBusy: false,            // ★追加: カードが合体するアニメーション中は、他の操作を受け付けない
    hintSteps: []             // ★追加: ヒントで表示する「10までの手順」
};

/**
 * ★追加: 対戦モード（1つの端末を順番に渡してあそぶモード）専用の状態
 * ------------------------------------------------------------
 * GameStateとは別に、対戦モードだけで使う情報をここにまとめておく。
 */
const BattleState = {
    players: [],              // 参加者一覧。中身は {name: "名前", totalTime: 合計タイム(秒)} の形
    questionsPerPlayer: 5,    // 1人あたりの問題数（デフォルトは5問）
    currentPlayerIndex: 0,    // 今、何番目のプレイヤーの番か（0から数える）
    currentQuestionIndex: 0,  // 今のプレイヤーが何問目を解いているか（0から数える）
    turnStartTime: null,      // 今のプレイヤーのターンが始まった時刻
    timerInterval: null,      // 経過時間の表示を更新するためのタイマー（setIntervalのID）
    playing: false            // ★追加: 今、誰かのターンをプレイ中か
};

// よく使うHTML要素をあらかじめ変数に入れておく（毎回 document.getElementById() を書かなくて済むように）
const elCardsContainer = document.getElementById('cards-container');
const elInstruction = document.getElementById('instruction-label');
const elTimerBox = document.getElementById('timer-box');
const elTimerLabel = document.getElementById('timer-label'); // ★追加: 「残り時間:」⇔「経過時間:」を切り替えるため
const elTimerVal = document.getElementById('timer-val');
const elScoreLabel = document.getElementById('score-label'); // ★追加: 「正解数:」⇔「進捗:」を切り替えるため
const elScoreVal = document.getElementById('score-val');
const elNextBanner = document.getElementById('next-question-banner');

// ★追加: 対戦モードの「今誰の番か」バッジ
const elBattlePlayerBadge = document.getElementById('battle-player-badge');
const elBattlePlayerName = document.getElementById('battle-player-name');

// ★追加: 記録モーダル用の要素
const elStatTotalCorrect = document.getElementById('stat-total-correct');
const elStatTaBest = document.getElementById('stat-ta-best');
const elStatFastest = document.getElementById('stat-fastest-time');
const elStatBestStreak = document.getElementById('stat-best-streak');

// ★追加: タイムアタックの「スタート画面 & カウントダウン」用の要素
const elTaOverlay = document.getElementById('modal-timeattack-start');
const elTaStartView = document.getElementById('ta-start-view');
const elTaCountdownView = document.getElementById('ta-countdown-view');
const elTaCountdownNumber = document.getElementById('ta-countdown-number');
const elFinalBestMessage = document.getElementById('final-best-message');


/**
 * F. ページが読み込まれた時の初期化 & ボタンにイベント（クリック時の処理）を登録する
 */
window.onload = function () {
    Make10Engine.initPool(); // 問題のストックを先に作っておく
    updateDifficultyUI();    // ★追加: むずかしさボタンの見た目を、保存されている設定に合わせる
    setupPWA();              // ★追加: ホーム画面に追加できるようにする準備
    setupEventListeners();
    switchMode('endless');   // 最初はエンドレスモードで始める
    toggleModal('modal-help', true); // ★追加: 開いたら最初に「あそびかた」を表示しておく
};

function setupEventListeners() {
    // モード切り替えタブ（エンドレス / タイムアタック / 対戦）
    // ★変更: タイムアタック・対戦のプレイ中は、すぐに移動せず確認を出す（requestSwitchMode）
    document.getElementById('mode-endless').addEventListener('click', (e) => requestSwitchMode('endless', e.currentTarget));
    document.getElementById('mode-time').addEventListener('click', (e) => requestSwitchMode('time', e.currentTarget));
    document.getElementById('mode-battle').addEventListener('click', (e) => requestSwitchMode('battle', e.currentTarget)); // ★追加

    // ★追加: 「移動の確認」ボタン
    document.getElementById('btn-leave-cancel').addEventListener('click', cancelLeave);
    document.getElementById('btn-leave-ok').addEventListener('click', confirmLeave);

    // 演算子ボタン（＋ － × ÷）
    document.querySelectorAll('.op-btn').forEach(btn => {
        btn.addEventListener('click', () => handleOpSelect(btn.dataset.op));
    });

    // 下部の操作ボタン（1手戻す / クリア / パス / ヒント）
    document.getElementById('btn-undo').addEventListener('click', handleUndo);
    document.getElementById('btn-reset-puzzle').addEventListener('click', handleResetPuzzle); // ★追加
    document.getElementById('btn-skip').addEventListener('click', () => {
        // ★追加: 対戦モードのパスは、進捗（何問目か）はそのままにして、5秒プラスして問題を入れ替える
        // （連続正解記録や画面の数字は、対戦では使っていないのでリセットしない）
        if (GameState.mode === 'battle') {
            if (GameState.isSolved) return; // 正解した直後は、次の問題への切り替え中なので何もしない
            sound.playSelect();
            // ★追加: ペナルティとして5秒プラスする
            // 「スタートした時刻」を5秒前にずらすと、経過時間が5秒増えて、表示も最終タイムも自動で5秒プラスになる
            BattleState.turnStartTime -= 5000;
            updateBattleTimerDisplay(); // 画面の経過時間もすぐに更新する
            loadBattlePuzzle(); // 新しい問題を出す。進捗の表示も今の状態に合わせて更新される
            return;
        }

        sound.playSelect();
        GameState.currentStreak = 0; // パスしたら連続正解記録はリセットされる
        elScoreVal.innerText = '0';  // ★追加: 画面に表示されている数字も0に戻す
        startNewPuzzle();
    });
    document.getElementById('btn-hint').addEventListener('click', (e) => showHintModal(e.currentTarget));
    document.getElementById('btn-hint-more').addEventListener('click', showFullHint); // ★追加: ヒントの2段階目（答えを全部見る）

    // ★追加: むずかしさボタン
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => changeDifficulty(btn.dataset.difficulty));
    });

    // 正解した後の「次の問題へ進む」ボタン
    document.getElementById('btn-next-puzzle').addEventListener('click', () => {
        sound.playSelect();
        elNextBanner.classList.add('hidden');
        startNewPuzzle();
    });

    // ★追加: タイムアタックの時間を選ぶボタン（30秒 / 1分 / 2分 / 3分）
    document.querySelectorAll('.ta-duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sound.playSelect();
            GameState.timeAttackDuration = parseInt(btn.dataset.seconds, 10);
            localStorage.setItem(StatsManager.KEY_TA_DURATION, String(GameState.timeAttackDuration)); // 次回も覚えておく
            updateTaDurationUI();
        });
    });

    // ★追加: タイムアタックの「スタート」ボタン → カウントダウンを開始する
    document.getElementById('btn-ta-start').addEventListener('click', startTimeAttackCountdown);

    // ★追加: 右上の記録（トロフィー）ボタン → 記録モーダルを開く
    document.getElementById('stats-btn').addEventListener('click', (e) => openStatsModal(e.currentTarget));

    // ★追加: 対戦モード関連のボタン
    setupBattleEventListeners();

    // ルール説明モーダルの開閉
    document.getElementById('help-btn').addEventListener('click', (e) => toggleModal('modal-help', true, e.currentTarget));
    document.querySelectorAll('.close-modal').forEach(b => {
        b.addEventListener('click', () => {
            // ★変更: id が「modal-」で始まる要素すべてではなく、
            // ポップアップ共通の「app-modal」クラスが付いた要素だけを閉じるようにする
            // （タイムアタックのスタート画面は仕組みが違うので、間違って巻き込まないため）
            document.querySelectorAll('.app-modal').forEach(m => toggleModal(m.id, false));
        });
    });

    // 効果音ON/OFFの切り替え
    document.getElementById('sound-toggle-btn').addEventListener('click', () => {
        sound.enabled = !sound.enabled;
        const icon = document.getElementById('sound-icon');
        icon.className = sound.enabled ? "fas fa-volume-up text-lg text-cyan-400" : "fas fa-volume-mute text-lg text-slate-500";
        // ★追加: 画面を読み上げるソフト向けに、今の状態とボタンの説明も更新する
        const soundBtn = document.getElementById('sound-toggle-btn');
        soundBtn.setAttribute('aria-pressed', String(sound.enabled));
        soundBtn.setAttribute('aria-label', sound.enabled ? '効果音をオフにする' : '効果音をオンにする');
    });

    // ★追加: シェアボタン（X / LINE / 画像でシェア）
    buildShareArea('result'); // タイムアップ画面のシェアボタンを作る
    buildShareArea('stats');  // 記録画面のシェアボタンを作る

    // タイムアタックの「もう一度挑戦する」ボタン
    document.getElementById('ta-retry-btn').addEventListener('click', () => {
        toggleModal('modal-gameover', false);
        switchMode('time'); // もう一度、スタート画面から始める
    });
}

/**
 * ★追加: 対戦モードのボタンにイベントを登録する
 * setupEventListeners() が長くなりすぎないように、別の関数に分けている
 */
function setupBattleEventListeners() {
    // ニックネームの「追加」ボタンとEnterキー
    document.getElementById('btn-battle-add-player').addEventListener('click', addBattlePlayer);
    document.getElementById('battle-nickname-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addBattlePlayer();
    });

    // 1人あたりの問題数を選ぶボタン（3問 / 5問 / 10問）
    document.querySelectorAll('.battle-qcount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            BattleState.questionsPerPlayer = parseInt(btn.dataset.count, 10);
            renderBattleQuestionCountButtons();
            sound.playSelect();
        });
    });

    // 「対戦開始」ボタン
    document.getElementById('btn-battle-start').addEventListener('click', () => {
        if (BattleState.players.length < 2) {
            showToast('2人以上のニックネームを追加してください');
            return;
        }
        startBattle();
    });

    // 各プレイヤーの「スタート」ボタン → カウントダウンを開始する
    document.getElementById('btn-battle-turn-ready').addEventListener('click', startBattleCountdown);

    // 1人のターンが終わった後の「次の人へわたす」ボタン
    document.getElementById('btn-battle-turn-next').addEventListener('click', goToNextBattleTurnOrResults);

    // 最終結果画面の「もう一度対戦する」ボタン
    document.getElementById('btn-battle-again').addEventListener('click', () => {
        sound.playSelect();
        hideAllBattleScreens();
        showBattleSetupScreen(); // ニックネームは残っているので、そのまま再戦できる
    });
}


/**
 * G. ゲームモード（エンドレス / タイムアタック）の切り替え
 */
function switchMode(newMode) {
    sound.playSelect();
    bumpPuzzleToken();            // ★追加: 前のモードで待っていたアニメーションなどを無効にする
    setDifficultyLocked(false);   // ★追加: モードを切り替えたら、むずかしさをまた選べるようにする
    GameState.mode = newMode;
    clearInterval(GameState.timerInterval);   // 前のタイマーが動いていたら止める
    clearInterval(BattleState.timerInterval); // ★追加: 対戦モードの経過時間タイマーも念のため止める
    GameState.taRunning = false;              // ★追加: プレイ中のフラグも解除する
    stopCountdown();                          // ★追加: カウントダウン中だった場合は、それも止める
    BattleState.playing = false;
    GameState.score = 0;
    GameState.currentStreak = 0; // ★追加: モードを切り替えたら連続正解カウントも0から
    elScoreVal.innerText = '0';

    // ★追加: 他のモードで変えた表示ラベルを、通常の状態に戻しておく
    elScoreLabel.innerText = '連続正解数:';
    elTimerLabel.innerText = '残り時間:';
    // ★追加: パスボタンの文字。対戦モードのときだけ「（＋5秒）」を付ける
    document.getElementById('skip-label').innerText = newMode === 'battle' ? 'パス（＋5秒）' : 'パス';
    elBattlePlayerBadge.classList.add('hidden');
    elBattlePlayerBadge.classList.remove('flex');
    elTaOverlay.classList.add('hidden');
    elTaOverlay.classList.remove('flex');
    hideAllBattleScreens();

    // タブの見た目（色）を切り替える
    const tabs = {
        endless: document.getElementById('mode-endless'),
        time: document.getElementById('mode-time'),
        battle: document.getElementById('mode-battle')
    };
    const activeClass = "mode-tab py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20";
    const inactiveClass = "mode-tab py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all text-slate-300 hover:text-slate-100 hover:bg-white/5";
    Object.keys(tabs).forEach(key => {
        tabs[key].className = (key === newMode) ? activeClass : inactiveClass;
    });

    // ★追加: ヒントボタンは「エンドレスモード」の時だけ表示する
    // （タイムアタック・対戦モードはタイムを競うモードなので、ヒントは使えないようにする）
    document.getElementById('btn-hint').classList.toggle('hidden', newMode !== 'endless');

    if (newMode === 'endless') {
        elTimerBox.classList.add('hidden');
        startNewPuzzle();
    } else if (newMode === 'time') {
        elTimerBox.classList.remove('hidden');
        // すぐにタイマーを始めず、まず「スタート画面」を見せる
        showTimeAttackStartScreen();
    } else if (newMode === 'battle') {
        // ★追加: 対戦モードは、まず参加者を登録する画面を見せる
        elTimerBox.classList.add('hidden');
        elCardsContainer.innerHTML = '';
        showBattleSetupScreen();
    }
}

// 新しい問題を読み込んで盤面をリセットする
function startNewPuzzle() {
    bumpPuzzleToken(); // ★追加
    GameState.isSolved = false;
    GameState.currentPuzzle = Make10Engine.getRandomPuzzle();
    GameState.cards = [...GameState.currentPuzzle.nums];
    GameState.history = [];
    GameState.puzzleStartTime = Date.now(); // ★追加: 「今、何時何分何秒か」を記録しておく（クリアタイム計測用）
    resetSelections();
    elNextBanner.classList.add('hidden');
    renderCards({ animate: 'deal' }); // ★変更: 新しい問題のカードは「ポンポンッ」と配られる
}


/**
 * ★追加: 「3・2・1」とカウントダウンする共通の関数
 * ------------------------------------------------------------
 * タイムアタックと対戦モードの両方で同じカウントダウンを使うので、
 * 1つの関数にまとめておくことで、同じコードを2回書かずに済むようにしている。
 *
 * numberEl: カウントダウンの数字を表示するHTML要素
 * onDone:   カウントダウンが0になったときに実行する関数
 */
// ★追加: 今カウントダウン中かどうかを覚えておく場所
// （カウントダウン中にモードを移動しようとしたとき、確認を出したり、止めたりするために使う）
const CountdownState = { timer: null, numberEl: null, onDone: null };

// カウントダウンを止める（数字の表示はそのまま）
function stopCountdown() {
    clearInterval(CountdownState.timer);
    CountdownState.timer = null;
}

function runCountdown(numberEl, onDone) {
    let count = 3;
    numberEl.innerText = count;
    stopCountdown(); // 念のため、前のカウントダウンが残っていたら止めておく
    CountdownState.numberEl = numberEl;
    CountdownState.onDone = onDone;

    // setIntervalで1秒ごとに数字を1つずつ減らしていく
    const countdownTimer = setInterval(() => {
        count--;

        if (count > 0) {
            // 数字を表示し直して、ポンと出るアニメーションをもう一度再生する
            numberEl.innerText = count;
            numberEl.classList.remove('countdown-pop');
            void numberEl.offsetWidth; // ★アニメーションを最初からやり直させるためのおまじない
            numberEl.classList.add('countdown-pop');
            sound.playOp();
        } else {
            // 0になったらカウントダウン終了！ 渡された処理を実行する
            clearInterval(countdownTimer);
            CountdownState.timer = null; // ★追加: カウントダウン終了
            sound.playMerge();
            onDone();
        }
    }, 1000);
    CountdownState.timer = countdownTimer; // ★追加: 動いているカウントダウンを覚えておく
}


/**
 * ★追加: タイムアタックの「スタート画面」と「3秒カウントダウン」の処理
 * ------------------------------------------------------------
 * 流れ: タブを押す → スタート画面を表示 → 「スタート」ボタンを押す
 *      → 3,2,1のカウントダウン → 60秒タイマー開始
 */

// 秒数を「30秒」「1分」のような表示用の文字にする
function formatDuration(seconds) {
    return seconds < 60 ? `${seconds}秒` : `${seconds / 60}分`;
}

// 時間ボタンの見た目と、説明の文章を、今選んでいる時間に合わせて更新する
function updateTaDurationUI() {
    const sec = GameState.timeAttackDuration;
    const activeClass = "ta-duration-btn px-4 py-2 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md";
    const inactiveClass = "ta-duration-btn px-4 py-2 rounded-xl text-sm font-bold transition-all bg-slate-800/80 text-slate-300 hover:bg-slate-700/80";
    document.querySelectorAll('.ta-duration-btn').forEach(btn => {
        btn.className = parseInt(btn.dataset.seconds, 10) === sec ? activeClass : inactiveClass;
    });
    document.getElementById('ta-desc').innerText = `${formatDuration(sec)}間でできるだけたくさん「10」を作ろう！`;
}

// スタート画面（説明とスタートボタン）を表示する
function showTimeAttackStartScreen() {
    updateTaDurationUI(); // 選んでいる時間に合わせて表示を更新
    elCardsContainer.innerHTML = ''; // カードはまだ出さない（スタート前なので）
    elTaStartView.classList.remove('hidden');
    elTaCountdownView.classList.add('hidden');
    elTaOverlay.classList.remove('hidden');
    elTaOverlay.classList.add('flex');
}

// 「スタート」ボタンが押された時に呼ばれる：3→2→1とカウントダウンしてからタイムアタックを始める
function startTimeAttackCountdown() {
    sound.playSelect();
    setDifficultyLocked(true); // ★追加: ゲーム中はむずかしさを変えられないようにする
    elTaStartView.classList.add('hidden');
    elTaCountdownView.classList.remove('hidden');
    elTaCountdownView.classList.add('flex');

    runCountdown(elTaCountdownNumber, () => {
        if (GameState.mode !== 'time') return; // ★追加: カウントダウン中に他のモードへ移動していたら、始めない
        // カウントダウン終了！ オーバーレイを消してゲームスタート
        elTaOverlay.classList.add('hidden');
        elTaOverlay.classList.remove('flex');
        startTimeAttack();
    });
}

// タイムアタックのタイマー（選んだ時間）をスタートする（実際にゲームが始まる部分）
function startTimeAttack() {
    GameState.timeAttackRemaining = GameState.timeAttackDuration;
    elTimerVal.innerText = `${GameState.timeAttackRemaining}s`;
    startNewPuzzle();

    GameState.taRunning = true; // ★追加: タイムアタックのプレイ中
    // ★変更: 1秒ごとの処理を関数にして取っておく（「移動の確認」で一時停止したあと、再開できるようにするため）
    GameState.tickTimeAttack = () => {
        GameState.timeAttackRemaining--;
        elTimerVal.innerText = `${GameState.timeAttackRemaining}s`;

        if (GameState.timeAttackRemaining <= 0) {
            clearInterval(GameState.timerInterval);
            GameState.taRunning = false; // ★追加: プレイ終了
            setDifficultyLocked(false); // ★追加: 終わったら、むずかしさをまた選べるようにする
            document.getElementById('final-difficulty').innerText = `むずかしさ: ${DIFFICULTY_LABELS[GameState.difficulty]}`; // ★追加: 結果画面にむずかしさを表示
            document.getElementById('final-score').innerText = GameState.score;
            document.getElementById('final-ta-subtitle').innerText = `${formatDuration(GameState.timeAttackDuration)}間チャレンジ終了！`;

            // ★追加: 自己ベストを更新したかチェックして、結果画面にメッセージを出す
            const isNewBest = StatsManager.updateTimeAttackBest(GameState.score);
            if (isNewBest && GameState.score > 0) {
                elFinalBestMessage.innerText = '🎉 自己ベストを更新しました！';
            } else {
                elFinalBestMessage.innerText = `自己ベスト: ${StatsManager.getTimeAttackBest()}問`;
            }

            // ★追加: シェア用の結果画像を作る
            drawResultImage(GameState.score, StatsManager.getTimeAttackBest(), isNewBest && GameState.score > 0);

            toggleModal('modal-gameover', true, elTimerBox); // ★追加: タイマー表示の位置から出てくるようにする
        }
    };
    GameState.timerInterval = setInterval(GameState.tickTimeAttack, 1000);
}


/**
 * ★追加: 対戦モード（1つの端末を順番に渡してあそぶモード）の処理
 * ------------------------------------------------------------
 * 流れ:
 *   (1) ニックネームを登録し、1人あたりの問題数を決める
 *   (2) 「◯◯さんの番です」→3,2,1カウントダウン
 *   (3) 決められた問題数を解く（かかった時間を計測する）
 *   (4) 結果画面 →（まだ他のプレイヤーがいれば(2)に戻る）
 *   (5) 全員終わったら、合計タイムが一番小さい人が優勝というランキングを表示する
 */

// 対戦モードの画面（4種類）を全部隠す。モードを切り替えた時などに呼ぶ
function hideAllBattleScreens() {
    ['battle-setup-screen', 'battle-turn-start-screen', 'battle-turn-result-screen', 'battle-final-results-screen'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
        el.classList.remove('flex');
    });
}

// (1) ニックネーム登録画面を表示する
function showBattleSetupScreen() {
    setDifficultyLocked(false); // ★追加: 対戦の準備中は、むずかしさを選べる
    renderBattlePlayersList();
    renderBattleQuestionCountButtons();
    const overlay = document.getElementById('battle-setup-screen');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

// ニックネームを1人分、参加者リストに追加する
function addBattlePlayer() {
    const input = document.getElementById('battle-nickname-input');
    const name = input.value.trim();
    if (name === '') return; // 空っぽなら何もしない

    if (BattleState.players.length >= 8) {
        showToast('参加人数は8人までです');
        return;
    }

    BattleState.players.push({ name: name, totalTime: 0 });
    input.value = '';
    renderBattlePlayersList();
    sound.playSelect();
}

// 参加者リストから1人削除する
function removeBattlePlayer(idx) {
    BattleState.players.splice(idx, 1);
    renderBattlePlayersList();
    sound.playSelect();
}

// HTMLに文字を差し込んでも安全なように、危険な記号を無害な文字に変換する
// （ニックネームに <script> のような文字が入っても悪さをしないようにするための対策）
function escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

// 参加者リストのHTMLを描き直す
function renderBattlePlayersList() {
    const list = document.getElementById('battle-players-list');
    list.innerHTML = '';
    BattleState.players.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-700/60';
        item.innerHTML = `<span class="text-sm font-bold text-slate-200">${idx + 1}. ${escapeHtml(p.name)}</span>`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-slate-400 hover:text-rose-400 px-2';
        removeBtn.setAttribute('aria-label', `${p.name}さんを削除`); // ★追加: アイコンだけのボタンなので、読み上げ用の説明を付ける
        removeBtn.innerHTML = '<i class="fas fa-xmark" aria-hidden="true"></i>';
        removeBtn.addEventListener('click', () => removeBattlePlayer(idx));

        item.appendChild(removeBtn);
        list.appendChild(item);
    });
    document.getElementById('battle-player-count').innerText = BattleState.players.length;
}

// 「1人あたりの問題数」ボタンの見た目を、今選ばれている問題数に合わせて更新する
function renderBattleQuestionCountButtons() {
    const activeClass = "battle-qcount-btn px-4 py-2 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md";
    const inactiveClass = "battle-qcount-btn px-4 py-2 rounded-xl text-sm font-bold transition-all bg-slate-800/80 text-slate-300 hover:bg-slate-700/80";
    document.querySelectorAll('.battle-qcount-btn').forEach(btn => {
        const isSelected = parseInt(btn.dataset.count, 10) === BattleState.questionsPerPlayer;
        btn.className = isSelected ? activeClass : inactiveClass;
    });
}

// 「対戦開始」ボタンが押された時の処理
function startBattle() {
    setDifficultyLocked(true); // ★追加: 全員が同じむずかしさであそべるように、対戦中は変えられなくする
    BattleState.players.forEach(p => p.totalTime = 0); // タイムをリセット（再戦の場合のため）
    BattleState.currentPlayerIndex = 0;

    hideAllBattleScreens();
    showBattleTurnStartScreen();
}

// (2) 「◯◯さんの番です」という、端末を渡すための画面を表示する
function showBattleTurnStartScreen() {
    const player = BattleState.players[BattleState.currentPlayerIndex];
    document.getElementById('battle-turn-start-name').innerText = player.name;

    document.getElementById('battle-ready-view').classList.remove('hidden');
    document.getElementById('battle-countdown-view').classList.add('hidden');

    const overlay = document.getElementById('battle-turn-start-screen');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

// 各プレイヤーの「スタート」ボタンが押された時：3,2,1とカウントダウンしてからそのプレイヤーのターンを始める
function startBattleCountdown() {
    sound.playSelect();
    document.getElementById('battle-ready-view').classList.add('hidden');
    const countdownView = document.getElementById('battle-countdown-view');
    countdownView.classList.remove('hidden');
    countdownView.classList.add('flex');

    const countdownNumber = document.getElementById('battle-countdown-number');
    runCountdown(countdownNumber, () => {
        if (GameState.mode !== 'battle') return; // ★追加: 同じ理由で、移動していたら始めない
        const overlay = document.getElementById('battle-turn-start-screen');
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        beginBattleTurn();
    });
}

// (3) 実際にそのプレイヤーの問題を出題し始める
function beginBattleTurn() {
    BattleState.playing = true; // ★追加: 対戦のプレイ中（移動の確認を出すために使う）
    BattleState.currentQuestionIndex = 0;
    BattleState.turnStartTime = Date.now(); // 今の時刻を「スタート時刻」として覚えておく

    // 経過時間を0.1秒ごとに画面へ表示し続ける
    BattleState.timerInterval = setInterval(updateBattleTimerDisplay, 100);

    elTimerBox.classList.remove('hidden');
    elBattlePlayerBadge.classList.remove('hidden');
    elBattlePlayerBadge.classList.add('flex');
    elBattlePlayerName.innerText = BattleState.players[BattleState.currentPlayerIndex].name;

    loadBattlePuzzle();
}

// ★変更: 対戦モード用に、新しい問題をランダムに出題する（プレイヤーごとに問題は変わる。全員共通ではない）
function loadBattlePuzzle() {
    bumpPuzzleToken(); // ★追加
    GameState.isSolved = false;
    GameState.currentPuzzle = Make10Engine.getRandomPuzzle();
    GameState.cards = [...GameState.currentPuzzle.nums];
    GameState.history = [];
    resetSelections();
    renderCards({ animate: 'deal' });
    updateBattleHud(); // 「進捗:」「経過時間:」の表示を更新する
}

// 対戦モード中は、スコア表示欄を「進捗（何問目/全部で何問）」の表示として使う
function updateBattleHud() {
    elTimerLabel.innerText = '経過時間:';
    elScoreLabel.innerText = '進捗:';
    elScoreVal.innerText = `${BattleState.currentQuestionIndex + 1}/${BattleState.questionsPerPlayer}`;
}

// 経過時間の表示（0.1秒ごとに呼ばれる）
function updateBattleTimerDisplay() {
    if (!BattleState.turnStartTime) return;
    const elapsed = (Date.now() - BattleState.turnStartTime) / 1000;
    elTimerVal.innerText = `${elapsed.toFixed(1)}s`;
}

// 対戦モードで1問正解した時に呼ばれる（checkVictory()から呼び出される）
function handleBattlePuzzleCleared() {
    BattleState.currentQuestionIndex++;

    if (BattleState.currentQuestionIndex < BattleState.questionsPerPlayer) {
        // まだ問題が残っているので、少し待ってから次の問題を出す
        setTimeout(() => {
            loadBattlePuzzle();
        }, 500);
    } else {
        // 全部解き終わった！ このプレイヤーの合計タイムを記録する
        clearInterval(BattleState.timerInterval);
        BattleState.playing = false; // ★追加: このターンのプレイ終了
        const elapsed = (Date.now() - BattleState.turnStartTime) / 1000;
        BattleState.players[BattleState.currentPlayerIndex].totalTime = Math.round(elapsed * 10) / 10;
        showBattleTurnResultScreen();
    }
}

// (4) 1人のターンが終わった時の結果画面を表示する
function showBattleTurnResultScreen() {
    const player = BattleState.players[BattleState.currentPlayerIndex];
    document.getElementById('battle-result-name').innerText = player.name;
    document.getElementById('battle-result-time').innerText = `${player.totalTime}秒`;

    const isLastPlayer = BattleState.currentPlayerIndex === BattleState.players.length - 1;
    document.getElementById('btn-battle-turn-next').innerText = isLastPlayer ? '結果を見る' : '次の人へわたす';

    elBattlePlayerBadge.classList.add('hidden');
    elBattlePlayerBadge.classList.remove('flex');
    elTimerBox.classList.add('hidden');

    const overlay = document.getElementById('battle-turn-result-screen');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

// 「次の人へわたす」または「結果を見る」ボタンが押された時の処理
function goToNextBattleTurnOrResults() {
    sound.playSelect();
    document.getElementById('battle-turn-result-screen').classList.add('hidden');
    document.getElementById('battle-turn-result-screen').classList.remove('flex');

    const isLastPlayer = BattleState.currentPlayerIndex === BattleState.players.length - 1;
    if (isLastPlayer) {
        showBattleFinalResults();
    } else {
        BattleState.currentPlayerIndex++;
        showBattleTurnStartScreen();
    }
}

// (5) 全員終わった後の、ランキング画面を表示する
function showBattleFinalResults() {
    setDifficultyLocked(false); // ★追加
    // タイムが小さい順（速い順）に並べ替える。元の配列は変えたくないのでコピーしてから並べ替える
    const ranking = [...BattleState.players].sort((a, b) => a.totalTime - b.totalTime);

    const list = document.getElementById('battle-ranking-list');
    list.innerHTML = '';
    ranking.forEach((p, idx) => {
        const rank = idx + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}位`;
        const isFirst = rank === 1;

        const row = document.createElement('div');
        row.className = `flex items-center justify-between px-4 py-3 rounded-xl border ${isFirst ? 'bg-amber-500/15 border-amber-400/40' : 'bg-slate-900/60 border-slate-700/60'}`;
        row.innerHTML = `
            <span class="font-bold text-slate-100 flex items-center gap-2">
                <span class="text-lg">${medal}</span> ${escapeHtml(p.name)}
            </span>
            <span class="font-black font-outfit text-cyan-300">${p.totalTime}秒</span>
        `;
        list.appendChild(row);
    });

    const overlay = document.getElementById('battle-final-results-screen');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}


/**
 * H. ★追加: 記録（累計正解数・自己ベスト）モーダルの表示
 */
function openStatsModal(originButton) {
    sound.playSelect();
    elStatTotalCorrect.innerText = StatsManager.getTotalCorrect();
    elStatTaBest.innerText = StatsManager.getTimeAttackBest();
    document.getElementById('stat-ta-best-label').innerText = `${formatDuration(GameState.timeAttackDuration)}での最高正解数`;

    // ★追加: 最速クリアタイムの表示（まだ記録がなければ「--」と表示する）
    const fastest = StatsManager.getFastestTime();
    elStatFastest.innerText = fastest !== null ? `${fastest}秒` : '--';

    // ★追加: 連続正解記録（コンボ）の表示
    elStatBestStreak.innerText = StatsManager.getBestStreak();

    drawStatsImage(); // ★追加: 記録のシェア画像を作る

    toggleModal('modal-stats', true, originButton);
}


/**
 * I. カード操作・計算まわりのコアインタラクション
 */

// 選択状態のリセット（カード1枚目・演算子の選択をなかったことにする）
function resetSelections() {
    GameState.selectedCardIdx1 = null;
    GameState.selectedOp = null;
    document.querySelectorAll('.op-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false'); // ★追加
    });
    updateInstruction();
}

// 「次に何をすればいいか」を伝えるガイド文章を更新する
function updateInstruction() {
    if (!elInstruction) return; // 要素が見つからない場合の安全対策

    if (GameState.selectedCardIdx1 === null) {
        // 「① まとめたい数字を選択」
        elInstruction.innerText = "① 合体させたい数字を選択";
    } else if (GameState.selectedOp === null) {
        // 「② 演算子（＋ － × ÷）を選択」
        elInstruction.innerText = "② 演算子（＋ － × ÷）を選択";
    } else {
        // 「③ 計算相手の数字を選択」
        elInstruction.innerText = "③ 計算相手の数字を選択";
    }
}

// 盤面の数字カードを描き直す
/**
 * ★変更: アニメーションを指定できるようにした
 *   options.animate: 'deal'  → 新しい問題を配るときの、順番にポンと出る動き
 *                    'merge' → 計算でできた新しいカードが「ポンッ」と出る動き
 *   options.shake:   揺らしたいカードの番号の配列（計算できなかった時に使う）
 */
function renderCards(options = {}) {
    const animate = options.animate || null;
    const shake = options.shake || [];
    elCardsContainer.innerHTML = '';
    GameState.cards.forEach((val, idx) => {
        const card = document.createElement('button');

        // 数値の表示形式（小数が出た場合は小数点2桁までにする）
        const displayVal = Number.isInteger(val) ? val : parseFloat(val.toFixed(2));

        // ★変更: 大きさの単位をpx(絶対サイズ)からrem(画面サイズに応じて伸び縮みする単位)に変更した
        card.className = `num-card min-w-[4.4rem] sm:min-w-[5.3rem] h-[5rem] sm:h-[6.25rem] px-3 bg-gradient-to-br from-slate-800 to-slate-900/90 border border-slate-700/80 text-cyan-300 rounded-2xl text-2xl sm:text-3xl font-black font-outfit flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all`;
        card.innerText = displayVal;

        // 選択中のカードをハイライトする
        const isSelected = GameState.selectedCardIdx1 === idx;
        if (isSelected) {
            card.classList.add('selected');
        }
        // ★追加: 読み上げソフト向けに、数字と「選択中かどうか」を伝える
        card.setAttribute('aria-pressed', String(isSelected));
        card.setAttribute('aria-label', `数字の${displayVal}${isSelected ? '（選択中）' : ''}`);

        // ★追加: カードのアニメーション
        if (animate === 'deal') {
            card.classList.add('card-deal');
            card.style.setProperty('--i', idx); // 左のカードから順番に出てくるように、番号で遅れ具合を変える
        } else if (animate === 'merge' && idx === GameState.cards.length - 1) {
            card.classList.add('card-merge-pop'); // 計算結果の新カードは、いつも一番最後に追加される
        }
        if (shake.includes(idx)) {
            card.classList.add('card-shake');
        }

        // 10が完成した時の強調表示
        if (GameState.cards.length === 1 && Math.abs(val - 10) < 0.0001) {
            card.classList.add('cleared');
        }

        card.addEventListener('click', () => handleCardClick(idx));
        elCardsContainer.appendChild(card);
    });
    updateInstruction();
}

// 数字カードをタップした時の処理
function handleCardClick(idx) {
    if (GameState.isSolved || GameState.isBusy) return; // ★変更: 合体アニメーション中も受け付けない

    // 1枚目のカードを選ぶ
    if (GameState.selectedCardIdx1 === null) {
        sound.playSelect();
        GameState.selectedCardIdx1 = idx;
        renderCards();
        return;
    }

    // 同じカードをもう一度タップしたら選択を解除する
    if (GameState.selectedCardIdx1 === idx && GameState.selectedOp === null) {
        sound.playSelect();
        resetSelections();
        renderCards();
        return;
    }

    // 演算子を選ぶ前に別のカードをタップした場合は、1枚目の選択を変更する
    if (GameState.selectedOp === null) {
        sound.playSelect();
        GameState.selectedCardIdx1 = idx;
        renderCards();
        return;
    }

    // 2枚目のカードが選ばれたので、計算を実行する
    const idx1 = GameState.selectedCardIdx1;
    const idx2 = idx;
    if (idx1 === idx2) return; // 同じカード同士は計算できない

    const val1 = GameState.cards[idx1];
    const val2 = GameState.cards[idx2];
    const op = GameState.selectedOp;

    // 0で割り算しようとした場合はエラーメッセージを出す
    // ★変更: alert()をやめて、画面下のメッセージ + カードを揺らす表示にした（ゲームの流れを止めないため）
    if (op === '/' && Math.abs(val2) < 0.000001) {
        showToast('0で割ることはできません！');
        resetSelections();
        renderCards({ shake: [idx1, idx2] });
        return;
    }

    // ★追加: 割り切れない（答えが小数になる）割り算をしようとした場合もエラーメッセージを出す
    if (op === '/' && Math.abs(val1 % val2) > 0.000001) {
        showToast('割り切れない計算はできません！');
        resetSelections();
        renderCards({ shake: [idx1, idx2] });
        return;
    }

    // 計算を実行
    const res = Make10Engine.calc(val1, op, val2);
    if (res === null) return;

    sound.playMerge();

    // ★追加: 2枚目に選んだカードにも、ほんの一瞬（0.1秒）だけ白い枠を出してから合体させる
    // 待っている間は isBusy を true にして、他の操作を受け付けないようにする
    GameState.isBusy = true;
    const token = GameState.puzzleToken;
    const secondCardEl = elCardsContainer.children[idx2];
    if (secondCardEl) secondCardEl.classList.add('card-flash');

    setTimeout(() => {
        // 待っている間に問題が切り替わっていたら（パスやモード切り替えなど）、何もしない
        if (token !== GameState.puzzleToken) return;
        GameState.isBusy = false;

        // 「1手戻す」のために、計算前の状態を保存しておく
        GameState.history.push([...GameState.cards]);

        // 使った2枚のカードを取り除き、計算結果を新しい1枚のカードにする
        const newCards = [];
        GameState.cards.forEach((v, i) => {
            if (i !== idx1 && i !== idx2) {
                newCards.push(v);
            }
        });
        newCards.push(res);
        GameState.cards = newCards;

        resetSelections();
        renderCards({ animate: 'merge' });

        // 残りカードが1枚で、それが10ならクリア判定！
        checkVictory();
    }, 100);
}

// 演算子ボタンをタップした時の処理
function handleOpSelect(opVal) {
    if (GameState.isSolved || GameState.isBusy) return;
    if (GameState.selectedCardIdx1 === null) return; // 1枚目のカードが未選択なら無効

    sound.playOp();
    GameState.selectedOp = opVal;

    document.querySelectorAll('.op-btn').forEach(b => {
        if (b.dataset.op === opVal) {
            b.classList.add('selected');
        } else {
            b.classList.remove('selected');
        }
        b.setAttribute('aria-pressed', String(b.dataset.op === opVal)); // ★追加
    });
    updateInstruction();
}

// 「1手戻す」機能
function handleUndo() {
    if (GameState.history.length === 0 || GameState.isSolved || GameState.isBusy) return;
    sound.playUndo();
    GameState.cards = GameState.history.pop();
    resetSelections();
    renderCards({ animate: 'deal' });
}

// ★追加: 「クリア」ボタン ― 1手戻すのではなく、今の問題を出題された時の状態まで一気に戻す
function handleResetPuzzle() {
    if (GameState.isSolved || GameState.isBusy) return;
    sound.playUndo();
    GameState.cards = [...GameState.currentPuzzle.nums]; // 最初に出題された数字に戻す
    GameState.history = []; // 「1手戻す」の記録も空にする
    resetSelections();
    renderCards({ animate: 'deal' });
}

// クリア判定（数字が「10」1枚になったか調べる）
function checkVictory() {
    if (GameState.cards.length === 1 && Math.abs(GameState.cards[0] - 10) < 0.0001) {
        GameState.isSolved = true;
        sound.playSuccess();
        confetti.explode();

        // ★追加: 対戦モードの時は、スコアや記録の代わりに「次の問題 or 結果画面」の処理をする
        if (GameState.mode === 'battle') {
            handleBattlePuzzleCleared();
            return;
        }

        GameState.score++; // タイムアタック終了時の「今回の正解数」用のカウント（連続でなくてもよい）

        // ★追加: 累計正解数を+1して保存する（モードに関係なく記録する）
        StatsManager.addCorrect();

        // ★追加: この1問にかかった秒数を計算して、最速記録より速ければ保存する
        const elapsedSeconds = (Date.now() - GameState.puzzleStartTime) / 1000;
        StatsManager.updateFastestTime(Math.round(elapsedSeconds * 10) / 10); // 小数点1桁に丸める

        // ★変更: 連続正解記録（コンボ）を1つ増やして、自己ベストより多ければ保存する
        // 画面に表示する数字も、こちらの「連続正解数」の方を使うようにする
        GameState.currentStreak++;
        elScoreVal.innerText = GameState.currentStreak;
        if (GameState.difficulty === 'random') {
            StatsManager.updateBestStreak(GameState.currentStreak); // ★変更: 連続正解の自己ベストは「ランダム」のときだけ記録する
        }

        // ★変更: タイムアタックは時間との勝負なので、ボタンを押さなくても自動で次の問題に進む
        // 緑に光る「10」を0.6秒だけ見せてから、次の問題を出す
        if (GameState.mode === 'time') {
            const token = GameState.puzzleToken;
            setTimeout(() => {
                // 待っている間にモードが変わった・時間切れになった場合は、何もしない
                if (token !== GameState.puzzleToken) return;
                if (GameState.mode !== 'time' || GameState.timeAttackRemaining <= 0) return;
                startNewPuzzle();
            }, 600);
            return;
        }

        // エンドレスモードは、これまで通り「次の問題へ進む」ボタンを出す
        const bannerToken = GameState.puzzleToken;
        setTimeout(() => {
            if (bannerToken !== GameState.puzzleToken) return; // 待っている間にパスやモード切り替えがあったら出さない
            elNextBanner.classList.remove('hidden');
        }, 400);
    }
}

// ヒントモーダルの表示
// ★変更: ヒントを2段階にした
//   1段階目: 「今の状態から、まずやる1手」だけを見せる
//   2段階目: 「答えを全部見る」ボタンを押したら、10になるまでの手順をすべて見せる
// 今の盤面(GameState.cards)から手順を計算するので、途中まで進めていても役に立つヒントになる
function showHintModal(originButton) {
    if (GameState.mode !== 'endless') return; // ★追加: ヒントはエンドレスモード専用の機能にする
    sound.playSelect();

    const container = document.getElementById('hint-content');
    const label = document.getElementById('hint-step-label');
    const moreBtn = document.getElementById('btn-hint-more');
    container.style.whiteSpace = 'pre-line'; // 手順を複数行で見せるため、改行をそのまま表示する

    const steps = Make10Engine.solveSteps(GameState.cards);
    GameState.hintSteps = steps || [];

    if (steps === null) {
        // 今の状態からは10が作れない（途中で行き止まりになった）
        label.innerText = '';
        container.innerText = '今の状態からは「10」が作れません。\n「すべて戻す」でやり直してみよう！';
        moreBtn.classList.add('hidden');
    } else if (steps.length === 0) {
        label.innerText = '';
        container.innerText = 'もう「10」が完成しています！';
        moreBtn.classList.add('hidden');
    } else if (steps.length === 1) {
        // 残り1手なら、最初の1手がそのまま答えになるので、ボタンは出さない
        label.innerText = 'あと1手で「10」です';
        container.innerText = Make10Engine.formatStep(steps[0]);
        moreBtn.classList.add('hidden');
    } else {
        label.innerText = 'まずは次の1手だけ';
        container.innerText = Make10Engine.formatStep(steps[0]);
        moreBtn.classList.remove('hidden');
    }
    toggleModal('modal-hint', true, originButton);
}

// 「答えを全部見る」ボタンが押された時：10になるまでの手順を、全部見せる
function showFullHint() {
    if (GameState.hintSteps.length === 0) return;
    sound.playSelect();
    const circled = ['①', '②', '③', '④', '⑤'];
    document.getElementById('hint-step-label').innerText = '答えの手順';
    document.getElementById('hint-content').innerText = GameState.hintSteps
        .map((s, i) => `${circled[i] || (i + 1) + '.'} ${Make10Engine.formatStep(s)}`)
        .join('\n');
    document.getElementById('btn-hint-more').classList.add('hidden');
}

/**
 * ★追加: プレイ中にモードを移動しようとしたときの「確認」
 * ------------------------------------------------------------
 * タイムアタックや対戦の最中に、うっかりタブを押すと記録が消えてしまう。
 * そうならないよう、プレイ中だけ「本当に移動する？」と聞く。
 * 確認を出している間は、時間が進まないように一時停止しておく。
 */
const LeaveState = { targetMode: null, pausedAt: 0, wasCountdown: false };

// 今、タイムアタックか対戦を「プレイ中」かどうか
function isPlayInProgress() {
    return (GameState.mode === 'time' && GameState.taRunning) ||
           (GameState.mode === 'battle' && BattleState.playing) ||
           CountdownState.timer !== null; // ★追加: 「3・2・1」のカウントダウン中も対象にする
}

// モードタブを押されたときの入り口。プレイ中でなければ、そのまま切り替える
function requestSwitchMode(newMode, originButton) {
    if (!isPlayInProgress()) {
        switchMode(newMode);
        return;
    }
    sound.playSelect();
    LeaveState.targetMode = newMode;
    LeaveState.pausedAt = Date.now();

    // 確認を出している間は、時間を止める
    LeaveState.wasCountdown = CountdownState.timer !== null;
    if (LeaveState.wasCountdown) {
        stopCountdown(); // カウントダウン中なら、カウントダウンを止める
    } else if (GameState.mode === 'time') {
        clearInterval(GameState.timerInterval);
    } else {
        clearInterval(BattleState.timerInterval);
    }

    let message;
    if (LeaveState.wasCountdown) {
        message = 'スタートのカウントダウン中です。移動すると、カウントダウンは最初からやり直しになります。';
    } else if (GameState.mode === 'time') {
        message = 'タイムアタックの途中です。移動すると、今回の記録は消えてしまいます。';
    } else {
        message = '対戦の途中です。移動すると、これまでの対戦の記録は消えてしまいます。';
    }
    document.getElementById('leave-message').innerText = message;
    toggleModal('modal-leave', true, originButton);
}

// 「つづける」: 止めていた時間をまた動かす
function cancelLeave() {
    sound.playSelect();
    toggleModal('modal-leave', false);
    if (LeaveState.wasCountdown) {
        // カウントダウンは、3からやり直す
        runCountdown(CountdownState.numberEl, CountdownState.onDone);
    } else if (GameState.mode === 'time') {
        GameState.timerInterval = setInterval(GameState.tickTimeAttack, 1000);
    } else if (GameState.mode === 'battle') {
        // 止めていた時間の分だけスタート時刻を後ろにずらして、経過時間が増えないようにする
        BattleState.turnStartTime += Date.now() - LeaveState.pausedAt;
        BattleState.timerInterval = setInterval(updateBattleTimerDisplay, 100);
    }
    LeaveState.targetMode = null;
}

// 「移動する」: 確認を閉じて、モードを切り替える
function confirmLeave() {
    toggleModal('modal-leave', false);
    const target = LeaveState.targetMode;
    LeaveState.targetMode = null;
    if (target) switchMode(target);
}

/**
 * ★追加: ブラウザの別のタブ（や別のアプリ）に切り替えたときの対策
 * ------------------------------------------------------------
 * カウントダウン中にページを離れると、離れている間にゲームが始まってしまい、
 * 戻ってきたときにはもう時間が進んでいる、ということが起きる。
 * そこで、カウントダウン中にページが見えなくなったら、カウントダウンをやめて
 * 「スタート」ボタンの画面に戻す（戻ってきたら、自分でスタートし直せる）
 */
document.addEventListener('visibilitychange', () => {
    if (!document.hidden || CountdownState.timer === null) return;
    stopCountdown();
    if (GameState.mode === 'time') {
        showTimeAttackStartScreen();
    } else if (GameState.mode === 'battle') {
        showBattleTurnStartScreen();
    }
});

/**
 * ★追加: 画面下に短いメッセージを出す関数（alert()の代わり）
 * ------------------------------------------------------------
 * alert() は画面全体が止まって、ゲームの雰囲気もこわれてしまう。
 * この関数なら、約2秒だけ表示して自動で消えるので、プレイの邪魔にならない。
 */
let toastTimer = null;
function showToast(message, type = 'error') {
    const el = document.getElementById('toast');
    el.innerText = message;
    el.classList.toggle('info', type === 'info'); // 'info' のときは、エラーではない青い枠線にする
    el.classList.add('show');
    clearTimeout(toastTimer); // 前のメッセージが残っていたら、消すタイマーをリセットする
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/**
 * ★追加: 問題が切り替わったときに呼ぶ関数
 * 「合体アニメーションの途中でパスされた」ような場合に、古い処理が後から動いてしまわないよう、
 * 番号(puzzleToken)を進めて、待っていた処理を無効にする
 */
function bumpPuzzleToken() {
    GameState.puzzleToken++;
    GameState.isBusy = false;
}

/**
 * ★追加: むずかしさ（かんたん / ふつう / むずかしい）の切り替え
 */
function updateDifficultyUI() {
    const activeClass = "difficulty-btn px-2 sm:px-4 py-1.5 rounded-lg text-sm font-bold transition-all bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md";
    const inactiveClass = "difficulty-btn px-2 sm:px-4 py-1.5 rounded-lg text-sm font-bold transition-all text-slate-300 hover:text-slate-100 hover:bg-white/5";
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        const isActive = btn.dataset.difficulty === GameState.difficulty;
        btn.className = isActive ? activeClass : inactiveClass;
        btn.setAttribute('aria-pressed', String(isActive));
        btn.disabled = GameState.difficultyLocked;
    });
}

// ゲーム中は変えられないようにする / また変えられるようにする
function setDifficultyLocked(locked) {
    GameState.difficultyLocked = locked;
    updateDifficultyUI();
}

function changeDifficulty(level) {
    if (GameState.difficultyLocked || !DIFFICULTY_LABELS[level]) return;
    if (GameState.difficulty === level) return; // 同じものを押しただけなら何もしない

    sound.playSelect();
    GameState.difficulty = level;
    localStorage.setItem('make10_difficulty', level); // 次回も覚えておく
    updateDifficultyUI();
    showToast(`むずかしさ: ${DIFFICULTY_LABELS[level]}`, 'info');

    // エンドレスモードなら、その場で新しいむずかしさの問題に入れ替える
    // （むずかしさを変えて連続記録をかせげないように、連続正解数は0に戻す）
    if (GameState.mode === 'endless') {
        GameState.currentStreak = 0;
        elScoreVal.innerText = '0';
        startNewPuzzle();
    }
    // タイムアタック・対戦は、スタートした時の問題から新しいむずかしさになる
}

/**
 * ★追加: PWA（ホーム画面に追加して、アプリのように使う / オフラインでも遊ぶ）の準備
 * ------------------------------------------------------------
 * 必要なものは3つ。
 *   (1) manifest ... アプリの名前・色・アイコンなどの情報。ファイルを増やさないよう、ここで自動的に作る
 *   (2) Service Worker (sw.js) ... 一度開いたページを端末に保存しておき、オフラインでも表示する係
 *   (3) インストールボタン ... 対応しているブラウザ(ChromeやEdgeなど)で、右上に表示する
 * ※ file:// で直接開いている間は、PWAの仕組みは使えない（https:// か localhost だけで動く）
 */
function setupPWA() {
    if (!/^https?:$/.test(location.protocol)) return;

    // (1) manifest を作って <head> に読み込ませる
    const dir = location.origin + location.pathname.replace(/[^/]*$/, ''); // このページがあるフォルダのURL
    const manifest = {
        name: 'Make 10 - 10を作ろう！',
        short_name: 'Make 10',
        description: '数字を合体させて「10」を作るパズルゲーム',
        lang: 'ja',
        start_url: location.origin + location.pathname,
        scope: dir,
        display: 'standalone',
        background_color: '#090d16',
        theme_color: '#090d16',
        // 新しい画像は作らず、今ある favicon.jpg をアイコンとして使う
        icons: [
            { src: dir + 'favicon.jpg', sizes: '192x192', type: 'image/jpeg', purpose: 'any' },
            { src: dir + 'favicon.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'any' }
        ]
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = URL.createObjectURL(manifestBlob);
    document.head.appendChild(link);

    // (2) Service Worker を登録する（登録に失敗してもゲーム自体は普通に動く）
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => { /* 何もしない */ });
    }

    // (3) 「インストール」ボタン
    const installBtn = document.getElementById('install-btn');
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();          // ブラウザ標準の案内は出さずに、自分のボタンで案内する
        deferredPrompt = e;
        installBtn.classList.remove('hidden');
    });
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        sound.playSelect();
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (err) {}
        deferredPrompt = null;
        installBtn.classList.add('hidden');
    });
    window.addEventListener('appinstalled', () => installBtn.classList.add('hidden'));
}

// モーダルの開閉を切り替える共通関数
/**
 * ★変更: モーダル（ポップアップ画面）の開閉を、ただの表示/非表示ではなく
 * 「右上のボタンに向かって縮んでいく」アニメーションにする関数
 * ------------------------------------------------------------
 * 使っている仕組み：
 *  ・CSSで transform-origin（拡大縮小の中心点）を右上に指定しておく(originクラス)
 *  ・「閉じている状態」は scale-0(大きさ0) + opacity-0(透明)
 *  ・「開いている状態」は scale-100(等倍) + opacity-100(不透明)
 *  ・この2つの状態をtransitionで滑らかに切り替えることで、
 *    ウィンドウの最小化のように「吸い込まれていく」動きに見える
 */
/**
 * ★変更: モーダル（ポップアップ画面）の開閉を、押したボタンの位置に向かって
 * 大きくなったり小さくなったりするアニメーションにする関数
 * ------------------------------------------------------------
 * originButton（開くきっかけになったボタン）を渡すと、そのボタンの真ん中の座標を計算して
 * transform-origin（拡大縮小の中心点）に設定する。これにより「そのボタンから生まれて、
 * そのボタンに戻っていく」ような、ウィンドウの最小化に似た動きになる。
 * 閉じるとき（show=false）はoriginButtonを渡さなくてよい。開いた時の中心点がそのまま
 * 残っているので、自動的に同じ場所へ向かって閉じていく。
 */
function toggleModal(id, show, originButton) {
    const m = document.getElementById(id);

    if (originButton) {
        // ボタンの画面上の位置（真ん中の座標）を取得する
        const rect = originButton.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        m.style.transformOrigin = `${centerX}px ${centerY}px`;
    }

    if (show) {
        m.classList.remove('invisible', 'opacity-0', 'scale-0');
        m.classList.add('visible', 'opacity-100', 'scale-100');
    } else {
        m.classList.remove('visible', 'opacity-100', 'scale-100');
        m.classList.add('invisible', 'opacity-0', 'scale-0');
    }
}


/* =====================================================
 * ★追加: SNSシェア機能（シェアするのは画像だけ）
 *   kind = 'result' → タイムアタックの結果
 *   kind = 'stats'  → 自分の記録
 * ===================================================== */

// 作っておいたシェア用の画像ファイルを入れておく場所（描き終わったときに入れる）
const ShareFiles = { result: null, stats: null };

// スマホ（iPhone / Android / iPad）かどうかを調べる
function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOSの対策
}

/**
 * シェアボタン（X / LINE / 保存）を作って表示する
 * 2か所（結果画面・記録画面）で同じボタンを使うので、1つの関数にまとめている
 * ボタンの色は、style.css と同じ色（紫・緑・すりガラス）にしている
 */
function buildShareArea(kind) {
    const area = document.getElementById('share-area-' + kind);
    const btnBase = 'py-2.5 rounded-xl text-white font-bold flex flex-col items-center gap-0.5 transition active:scale-95 ';
    area.innerHTML = `
        <div class="text-xs text-slate-400 font-semibold mb-2">この記録を画像でシェアする</div>
        <div class="grid grid-cols-3 gap-2">
            <button data-action="x" class="${btnBase}" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border: 1px solid #a5b4fc;"><i class="fab fa-x-twitter text-lg"></i><span class="text-xs">X</span></button>
            <button data-action="line" class="${btnBase}" style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); border: 1px solid #6ee7b7;"><i class="fab fa-line text-lg"></i><span class="text-xs">LINE</span></button>
            <button data-action="save" class="${btnBase} glass-card hover:bg-white/10"><i class="fas fa-download text-lg"></i><span class="text-xs">保存</span></button>
        </div>
        <p id="share-msg-${kind}" class="text-xs text-sky-400 mt-2 min-h-[1rem]"></p>
    `;

    // 3つのボタンに、それぞれの処理を結びつける
    area.querySelector('[data-action="x"]').addEventListener('click', () => shareImage(kind, 'x'));
    area.querySelector('[data-action="line"]').addEventListener('click', () => shareImage(kind, 'line'));
    area.querySelector('[data-action="save"]').addEventListener('click', () => saveImage(kind));
}

// ボタンの下にメッセージを出す小さな関数
function showShareMessage(kind, text) {
    document.getElementById('share-msg-' + kind).innerText = text;
}

// canvasの絵を、PNG画像のデータ（Blob）にして返す
function canvasToBlob(kind) {
    const canvas = document.getElementById('share-canvas-' + kind);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// 画像を保存（ダウンロード）する
async function saveImage(kind) {
    const blob = await canvasToBlob(kind);
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = kind === 'result' ? 'make10-result.png' : 'make10-record.png';
    a.click();
    URL.revokeObjectURL(a.href);
    showShareMessage(kind, '画像を保存しました');
}

/**
 * 画像だけをシェアする（app は 'x' か 'line'）
 *  - スマホ: シェア画面がすぐに開くので、XまたはLINEのアプリを選び、
 *            LINEなら送る相手を選ぶだけで、画像がシェアされる（文章やURLは付かない）
 *  - PC: 画像をクリップボードにコピーして、XまたはLINEを開く
 *        → 開いた画面で Ctrl+V で貼り付ける
 *  - コピーできないとき: 画像を保存する
 * ※ XやLINEはURLだけでは画像を付けられないので、この方法にしている
 */
async function shareImage(kind, app) {
    const file = ShareFiles[kind];

    // (1) スマホ: 画像だけを渡して、シェア画面を開く
    if (isMobileDevice() && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file] });
            return;
        } catch (e) {
            if (e.name === 'AbortError') return; // 自分でキャンセルしたときは何もしない
        }
    }

    // (2) PC: 先にXかLINEを開く
    // （ボタンを押した直後でないと、新しいタブがブロックされることがあるため）
    const openUrl = app === 'x'
        ? 'https://x.com/intent/post'        // Xの投稿画面（文章は空）
        : 'https://line.me/R/nv/chat';       // LINEのトーク選択画面
    window.open(openUrl, '_blank', 'noopener');

    // 画像をクリップボードにコピーする（httpsのページかlocalhostでないと使えない）
    try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasToBlob(kind) })]);
        showShareMessage(kind, '画像をコピーしました！開いた画面で貼り付け（Ctrl+V）してね');
    } catch (e) {
        // (3) コピーできなかったときは、画像を保存する
        await saveImage(kind);
        showShareMessage(kind, 'コピーできなかったので画像を保存しました。投稿するときに画像を選んでね');
    }
}

// 描き終わった canvas から画像ファイルを作って、ShareFiles に入れておく（スマホのシェアで使う）
async function cacheShareFile(kind) {
    const blob = await canvasToBlob(kind);
    if (blob) ShareFiles[kind] = new File([blob], `make10-${kind}.png`, { type: 'image/png' });
}

/* ----- ここから下は、シェア画像を canvas に描く部分 ----- */
/* 色は style.css と同じ色を使っている
   背景 #090d16 / 水色 #38bdf8 / 緑 #6ee7b7・#06b6d4 / 紫 #a5b4fc / 文字 #f8fafc */

// 背景とカードなど、2つの画像で共通の部分を描く（1200×630は、SNSで見やすい横長サイズ）
async function drawShareBase(kind, subtitle) {
    // フォント（Googleフォント）が読み込み終わってから描く。失敗しても続行する
    try {
        await Promise.all([
            document.fonts.load('900 100px "Outfit"'),
            document.fonts.load('900 40px "M PLUS Rounded 1c"')
        ]);
    } catch (e) { /* 読み込めなくても標準フォントで描ける */ }

    const canvas = document.getElementById('share-canvas-' + kind);
    const ctx = canvas.getContext('2d');
    const W = canvas.width;   // 1200
    const H = canvas.height;  // 630

    // 背景（ゲーム画面と同じ、濃い紺色 + 3か所のぼんやりした光）
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, W, H);
    const glows = [
        [0, 0, 'rgba(30, 27, 75, 0.7)'],
        [W, H, 'rgba(15, 23, 42, 0.8)'],
        [W / 2, H / 2, 'rgba(13, 148, 136, 0.08)']
    ];
    glows.forEach(g => {
        const r = ctx.createRadialGradient(g[0], g[1], 0, g[0], g[1], W * 0.6);
        r.addColorStop(0, g[2]);
        r.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = r;
        ctx.fillRect(0, 0, W, H);
    });

    // 中央の大きなカード（すりガラス風パネルと同じ色）
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    roundRect(ctx, 60, 60, W - 120, H - 120, 40);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // タイトルとサブタイトル
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 64px "Outfit", sans-serif';
    ctx.fillText('MAKE 10', W / 2, 150);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 32px "M PLUS Rounded 1c", sans-serif';
    ctx.fillText(subtitle, W / 2, 200);

    return { ctx, W, H };
}

/**
 * タイムアタックの結果画像を描く
 * @param {number} score   今回の正解数
 * @param {number} best    自己ベスト
 * @param {boolean} isNew  自己ベストを更新したか
 */
async function drawResultImage(score, best, isNew) {
    showShareMessage('result', ''); // 前のメッセージを消す
    const { ctx, W } = await drawShareBase('result', `タイムアタック ${formatDuration(GameState.timeAttackDuration)}・${DIFFICULTY_LABELS[GameState.difficulty]}`);

    // 正解数（いちばん大きく）
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 210px "Outfit", sans-serif';
    ctx.fillText(String(score), W / 2 - 60, 420);

    // 「問クリア！」は数字の右がわに置く（数字の幅を測ってから位置を決める）
    const numWidth = ctx.measureText(String(score)).width;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '900 64px "M PLUS Rounded 1c", sans-serif';
    ctx.fillText('問クリア！', W / 2 - 60 + numWidth / 2 + 20, 420);
    ctx.textAlign = 'center';

    // 自己ベスト
    ctx.fillStyle = isNew ? '#6ee7b7' : '#94a3b8';
    ctx.font = '800 38px "M PLUS Rounded 1c", sans-serif';
    ctx.fillText(isNew ? '🎉 自己ベスト更新！' : `自己ベスト ${best}問`, W / 2, 500);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 24px "M PLUS Rounded 1c", sans-serif';
    ctx.fillText('数字を合体させて「10」を作ろう！', W / 2, 555);

    await cacheShareFile('result');
}

/**
 * 「自分の記録」の画像を描く（4つの記録を2×2で並べる）
 */
async function drawStatsImage() {
    showShareMessage('stats', '');
    const { ctx } = await drawShareBase('stats', '自分の記録');

    const fastest = StatsManager.getFastestTime();
    // [ラベル, 値, 数字の色]
    const items = [
        ['累計正解数', `${StatsManager.getTotalCorrect()}`, '#38bdf8'],
        [`タイムアタック${formatDuration(GameState.timeAttackDuration)}の自己ベスト`, `${StatsManager.getTimeAttackBest()}`, '#6ee7b7'],
        ['最速クリアタイム', fastest !== null ? `${fastest}秒` : '--', '#06b6d4'],
        ['連続正解記録（ランダム）', `${StatsManager.getBestStreak()}`, '#a5b4fc']
    ];
    items.forEach((item, n) => {
        const cx = n % 2 === 0 ? 340 : 860;   // 左の列 / 右の列
        const top = n < 2 ? 250 : 420;        // 上の段 / 下の段

        // 項目ごとの小さな四角（ガラスカードと同じ色）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        roundRect(ctx, cx - 230, top, 460, 140, 24);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 26px "M PLUS Rounded 1c", sans-serif';
        ctx.fillText(item[0], cx, top + 45);
        ctx.fillStyle = item[2];
        ctx.font = '900 70px "Outfit", sans-serif';
        ctx.fillText(item[1], cx, top + 118);
    });

    await cacheShareFile('stats');
}

// 角が丸い四角形の線を引く道具（canvasには最初から付いていないので自作）
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
