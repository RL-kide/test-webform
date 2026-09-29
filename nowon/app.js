// NowOn フロントエンドモック
// バックエンドなし。状態はブラウザの localStorage に保存します（使えない環境ではメモリのみ）。

(function () {
    'use strict';

    const STORAGE_KEY = 'nowon-mock-state-v1';
    const ME = 4821;      // デモの来場者（井出さま）
    const ABSENT = 4833;  // デモの欠席者
    const BOX_BASE = 'https://nowon.example/box/';

    // ---------- 状態 ----------

    function seedState() {
        const lastNames = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '松本'];
        const firstNames = ['一郎', '花子', '健太', '美咲', '大輔', '直子', '翔', '優子', '誠', '恵'];
        const reservations = [{ id: ME, name: '井出 勝彦', attended: false, opened: false }];
        // 他の41件：30件来場（うち27件開封）、11件欠席
        for (let i = 0; i < 41; i++) {
            const id = 4800 + i + (4800 + i >= ME ? 1 : 0);
            const attended = i < 30;
            reservations.push({
                id: id,
                name: lastNames[i % lastNames.length] + ' ' + firstNames[i % firstNames.length],
                attended: attended,
                opened: attended && i < 27
            });
        }
        // デモの欠席者を必ず欠席にしておく
        reservations.forEach(function (r) {
            if (r.id === ABSENT) { r.attended = false; r.opened = false; }
        });
        return {
            event: { date: '2026-09-30', time: '14:00', title: '工場見学' },
            box: {
                published: true,
                fileName: '見学資料.pdf',
                fileType: 'application/pdf',
                fileData: null,
                expireDays: 14,
                method: 'entrance'
            },
            reservations: reservations
        };
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* 保存領域が使えない場合は初期状態 */ }
        return seedState();
    }

    let state = loadState();

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            // 大きいファイルで容量を超えた場合は中身を捨てて名前だけ残す
            if (state.box.fileData) {
                state.box.fileData = null;
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e2) { /* noop */ }
            }
        }
    }

    function findReservation(id) {
        return state.reservations.find(function (r) { return r.id === Number(id); }) || null;
    }

    function counts() {
        const total = state.reservations.length;
        const attended = state.reservations.filter(function (r) { return r.attended; }).length;
        const opened = state.reservations.filter(function (r) { return r.opened; }).length;
        return { total: total, attended: attended, opened: opened, absent: total - attended };
    }

    // ---------- 表示用ヘルパー ----------

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function md(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    function expireDate() {
        const d = new Date(state.event.date + 'T00:00:00');
        d.setDate(d.getDate() + Number(state.box.expireDays));
        return d;
    }

    function expireLabel() {
        const d = expireDate();
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    function isExpired() {
        const end = expireDate();
        end.setHours(23, 59, 59, 999);
        return new Date() > end;
    }

    function eventLabel() {
        return md(state.event.date) + ' ' + state.event.title + ' ' + state.event.time;
    }

    function boxUrl(id) {
        return BOX_BASE + 'ev' + state.event.date.replace(/-/g, '') + '-' + id;
    }

    // 見た目だけのQR（読み取りはできません）。文字列から決まった模様を描きます。
    function qrSvg(text) {
        const n = 21;
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        function rnd() {
            h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
            return (h >>> 0) / 4294967296;
        }
        function inFinder(x, y) {
            return (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
        }
        let cells = '';
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                if (inFinder(x, y)) continue;
                if (rnd() < 0.5) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
            }
        }
        function finder(x, y) {
            return '<rect x="' + x + '" y="' + y + '" width="7" height="7"/>' +
                '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/>' +
                '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3"/>';
        }
        return '<svg viewBox="-1 -1 23 23" fill="#1e365d" aria-hidden="true">' +
            '<rect x="-1" y="-1" width="23" height="23" fill="#fff"/>' +
            finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + cells + '</svg>';
    }

    function qrBlock(text, label, large) {
        return '<div class="qr' + (large ? ' large' : '') + '">' + qrSvg(text) +
            (label ? '<span>' + esc(label) + '</span>' : '') + '</div>';
    }

    function title(a, b) {
        return '<h1 class="page-title">' + esc(a) + '<span class="sep">|</span>' + esc(b) + '</h1>';
    }

    function talk(body, heading, wow) {
        return '<aside class="talk"><h3' + (wow ? ' class="wow"' : '') + '>' + esc(heading || '話すこと') + '</h3>' +
            '<div class="talk-body">' + body + '</div></aside>';
    }

    function frame(head, body, isWindow) {
        const headHtml = isWindow
            ? '<div class="frame-head window"><span class="dots"></span><span>' + head + '</span></div>'
            : '<div class="frame-head">' + head + '</div>';
        return '<section class="frame">' + headHtml + '<div class="frame-body">' + body + '</div></section>';
    }

    // ---------- 画面 ----------

    const routes = {};

    // 表紙：流れ
    routes[''] = {
        nav: 'はじめに',
        note: '予約の作成・変更・キャンセルはChoiceRESERVE / ツドルのまま。NowOn は「来たフラグ」と「箱」だけ。',
        render: function () {
            const steps = [
                ['主催', '開催に資料を1つ載せる', '#/organizer'],
                ['予約', '本体のまま確定メール', '#/mail-confirm'],
                ['当日', 'QRで「来た」が付く', '#/entrance'],
                ['箱', '来た人だけ資料が開く', '#/box'],
                ['欠席', '同じリンクでも開かない', '#/box']
            ];
            return '<h1 class="page-title">予約済みで、来た人にだけ渡す。</h1>' +
                '<p>登場人物と1本の流れ。各カードから画面モックへ進めます。</p>' +
                '<div class="flow">' + steps.map(function (s, i) {
                    return '<a href="' + s[2] + '"><div class="n">' + (i + 1) + '</div><div class="t">' + s[0] +
                        '</div><div class="d">' + s[1] + '</div></a>';
                }).join('') + '</div>' +
                '<p><strong>V1の約束：</strong>来ていない予約者のリンクは開かない。<br>' +
                '<strong>V1で言わない：</strong>来た本人以外には絶対開かない（転送は残る）。アプリも会員登録も不要。</p>' +
                '<h2 class="page-title" style="font-size:18px">V1に無いもの</h2>' +
                '<ul class="nothave">' + ['専用アプリのインストール', '新しい会員登録', 'eKYC・身分証', 'チャットと決済',
                    '個人の顔切り出しアルバム', '来場者からの課金', 'ランキングとSNS', '予約の作成そのもの']
                    .map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
                '<p class="hint">このモックはフロントエンドのみです。状態はこのブラウザに保存され、右上の「デモ状態をリセット」で初期化できます。' +
                'QRは見た目だけで読み取りはできません（読み取りはボタンで代用）。</p>';
        }
    };

    // 主催｜荷物を載せる
    routes.organizer = {
        nav: '主催｜荷物を載せる',
        note: '主催が見る管理。開催は予約本体から引き継ぐ。',
        render: function () {
            const b = state.box;
            const form =
                '<form id="boxForm">' +
                '<div class="field"><label>開催</label><div class="box-input">' + esc(eventLabel()) + '　（予約本体の枠）</div></div>' +
                '<div class="field"><label>荷物</label><div class="box-input">' +
                '<label class="file-btn">[ ファイルを置く ]<input type="file" id="fileInput"></label>' +
                '<span id="fileName">' + (b.fileName ? esc(b.fileName) : '<span class="hint">未選択</span>') + '</span></div></div>' +
                '<div class="field"><label>期限</label><div class="box-input"><select id="expireDays">' +
                [7, 14, 30].map(function (d) {
                    return '<option value="' + d + '"' + (Number(b.expireDays) === d ? ' selected' : '') + '>開催後 ' + d + '日</option>';
                }).join('') + '</select></div></div>' +
                '<div class="field"><label>受け取り</label><div class="box-input">' +
                '<label class="radio"><input type="radio" name="method" value="entrance"' + (b.method === 'entrance' ? ' checked' : '') + '>入場で読む</label>' +
                '<span>／</span>' +
                '<label class="radio"><input type="radio" name="method" value="exit"' + (b.method === 'exit' ? ' checked' : '') + '>出口の掲示を自分で読む</label>' +
                '</div></div>' +
                '<p class="hint">V1は1ファイル。置き直すと前のファイルと入れ替わります。</p>' +
                '<div class="actions"><button type="submit" class="btn" id="publishBtn"' + (b.fileName ? '' : ' disabled') + '>この開催に載せる</button></div>' +
                '<div class="toast" id="toast">' + (b.published ? '載せ済み：' + esc(b.fileName) + '（期限 ' + expireLabel() + '）' : '') + '</div>' +
                '</form>';
            return title('主催', '荷物を載せる') +
                '<div class="cols cols-2">' +
                frame('NowOn　開催：' + esc(md(state.event.date) + ' ' + state.event.title + ' ' + state.event.time), form, true) +
                talk('<p>資料はメールに付けない。<br>箱に1つ置く。</p>' +
                    '<p>予約者全員に届く一斉添付をやめる、が最初の価値。</p>' +
                    '<p>写真は同じ場所に2個目として後から足せる。V1は1ファイル。</p>') +
                '</div>';
        },
        mount: function () {
            let pending = null;
            const fileInput = document.getElementById('fileInput');
            const publishBtn = document.getElementById('publishBtn');
            fileInput.addEventListener('change', function () {
                const f = fileInput.files[0];
                if (!f) return;
                document.getElementById('fileName').textContent = f.name;
                publishBtn.disabled = false;
                pending = { fileName: f.name, fileType: f.type || 'application/octet-stream', fileData: null };
                // 2MB以下なら中身も保存して「開く」で表示できるようにする
                if (f.size <= 2 * 1024 * 1024) {
                    const reader = new FileReader();
                    reader.onload = function () { if (pending) pending.fileData = reader.result; };
                    reader.readAsDataURL(f);
                }
            });
            document.getElementById('boxForm').addEventListener('submit', function (e) {
                e.preventDefault();
                if (pending) {
                    state.box.fileName = pending.fileName;
                    state.box.fileType = pending.fileType;
                    state.box.fileData = pending.fileData;
                }
                state.box.expireDays = Number(document.getElementById('expireDays').value);
                state.box.method = document.querySelector('input[name=method]:checked').value;
                state.box.published = true;
                saveState();
                document.getElementById('toast').textContent =
                    '載せました：' + state.box.fileName + '（期限 ' + expireLabel() + '）';
            });
        }
    };

    // 予約者｜確定メール
    routes['mail-confirm'] = {
        nav: '予約者｜確定メール',
        note: '既存の確定メール。NowOnは一文とQRが増えるだけ。',
        render: function () {
            const me = findReservation(ME);
            const mail =
                '<div class="mail">' +
                '<div class="subject">件名：ご予約確定　' + esc(md(state.event.date) + ' ' + state.event.title) + '</div>' +
                '<p>' + esc(me.name.split(' ')[0]) + 'さま</p>' +
                '<p>' + esc(md(state.event.date) + ' ' + state.event.time + ' ' + state.event.title) + 'を受け付けました。</p>' +
                '<p><span class="new">当日、受付または終了後に資料を受け取れます。メールには添付していません。</span></p>' +
                '<div class="mail-qr">' + qrBlock('reservation:' + ME) +
                '<div><a href="#/reservation?r=' + ME + '">予約確認</a><div class="hint">予約#' + ME + '</div></div></div>' +
                '</div>';
            return title('予約者', '確定メール（予約本体）') +
                '<div class="cols cols-2">' + frame('メール', mail) +
                talk('<p>資料PDFを添付しない。<br>BCCの一斉送信もしない。</p>' +
                    '<p>付くのは「受け取れる」という一文と、予約確認のQR。</p>' +
                    '<p>欠席してもメールは届く。箱は開かない。</p>', 'ここが今までと違う') +
                '</div>';
        }
    };

    // 来場者｜予約確認（単独表示）
    routes.reservation = {
        nav: null,
        note: '予約確認は予約本体の画面。NowOnはQRを出すだけ。',
        render: function (q) {
            const r = findReservation(q.r || ME);
            if (!r) return title('来場者', '予約確認') + '<div class="card ng big">予約が見つかりません</div>';
            return title('来場者', '予約確認') +
                '<div class="cols cols-3">' +
                frame('来場者の予約確認', reservationBody(r)) +
                '<div></div><div></div></div>';
        }
    };

    function reservationBody(r) {
        return '<p>' + esc(md(state.event.date) + ' ' + state.event.time) + '<br>' + esc(state.event.title) + '</p>' +
            qrBlock('reservation:' + r.id, 'QR') +
            '<p class="caption">この画面を出す</p>' +
            '<p class="caption hint">予約#' + r.id + '</p>';
    }

    // 当日｜入場で読む
    routes.entrance = {
        nav: '当日｜入場で読む',
        note: 'クローズド研修・説明会向け。スタッフが読む。',
        render: function (q) {
            const target = findReservation(q.r || ME);
            const staff =
                '<div class="hint">読取結果</div>' +
                '<div id="scanResult" class="card big" style="margin:8px 0 16px">まだ読んでいません</div>' +
                '<p id="scanNote"></p>' +
                '<button type="button" class="btn block" id="scanBtn">カメラで読む（左のQRを読んだことにする）</button>' +
                '<details style="margin-top:12px"><summary class="hint">予約IDを指定して読む（デモ用）</summary>' +
                '<div class="box-input" style="margin-top:8px"><input type="text" id="manualId" placeholder="例：4821" inputmode="numeric">' +
                '<button type="button" class="btn sub mini" id="manualBtn">読む</button></div></details>';
            return title('当日', '入場で読む') +
                '<div class="cols cols-arrow">' +
                frame('来場者の予約確認', reservationBody(target)) +
                '<div class="arrow">→</div>' +
                frame('スタッフの受付', staff) +
                talk('<p>専用端末は持たない。スタッフのスマホのカメラで読む。</p>' +
                    '<p>名簿をその場で突合しない。読めた予約IDにフラグが立つだけ。</p>' +
                    '<p>読めなければ入場は従来どおり口頭。<br>NowOnは止めない。</p>') +
                '</div>';
        },
        mount: function (q) {
            function scan(id) {
                const box = document.getElementById('scanResult');
                const note = document.getElementById('scanNote');
                const r = findReservation(id);
                if (!r) {
                    box.className = 'card ng big';
                    box.innerHTML = '読み取れませんでした';
                    note.textContent = '入場は従来どおり口頭で。NowOnは止めない。';
                    return;
                }
                const already = r.attended;
                r.attended = true;
                saveState();
                box.className = 'card ok big';
                box.innerHTML = '来場<br>' + esc(r.name) + '<br>予約 #' + r.id;
                note.textContent = already ? 'この予約には既に「来た」が付いています。' : 'この予約に「来た」が付きました。';
            }
            document.getElementById('scanBtn').addEventListener('click', function () { scan(q.r || ME); });
            document.getElementById('manualBtn').addEventListener('click', function () {
                scan(document.getElementById('manualId').value.replace(/[^0-9]/g, ''));
            });
        }
    };

    // 当日｜出口の掲示を自分で読む
    routes.exit = {
        nav: '当日｜出口の掲示',
        note: '見学・体験向け。スタッフが読まない。',
        render: function (q) {
            const who = q.r === 'none' ? null : findReservation(q.r || ME);
            const poster =
                '<div class="hint">会場の掲示</div>' +
                '<h2 style="color:var(--navy);margin:4px 0 0">本日の資料はこちら</h2>' +
                qrBlock('event:' + state.event.date, '開催QR', true) +
                '<p>予約確認のQRと<br>この掲示を組み合わせて開く</p>';
            const phone =
                '<div class="box-input" style="margin-bottom:12px"><select id="whoSel">' +
                '<option value="' + ME + '"' + (who && who.id === ME ? ' selected' : '') + '>予約#' + ME + ' の予約確認を開いている</option>' +
                '<option value="none"' + (!who ? ' selected' : '') + '>予約確認を開いていない（予約なし）</option>' +
                '</select></div>' +
                '<p>予約確認を開いた状態で掲示を読む</p>' +
                '<div id="selfResult"></div>' +
                '<button type="button" class="btn block" id="readPosterBtn">掲示のQRを読む</button>';
            return title('当日', '出口の掲示を自分で読む') +
                '<div class="cols cols-poster">' +
                frame('会場の掲示', poster) +
                frame('来場者スマホ', phone) +
                talk('<p>予約なしで掲示だけ読んでも箱は開かない。予約IDが先。</p>') +
                '</div>';
        },
        mount: function () {
            document.getElementById('whoSel').addEventListener('change', function () {
                location.hash = '#/exit?r=' + this.value;
            });
            document.getElementById('readPosterBtn').addEventListener('click', function () {
                const v = document.getElementById('whoSel').value;
                const out = document.getElementById('selfResult');
                const r = v === 'none' ? null : findReservation(v);
                if (!r) {
                    out.innerHTML = '<div class="card ng big" style="margin-bottom:12px">予約確認を先に開いてください<br><span class="hint">掲示だけでは箱は開きません</span></div>';
                    return;
                }
                r.attended = true;
                saveState();
                out.innerHTML = '<a class="card ok-soft big" style="display:flex;margin-bottom:12px;text-decoration:none" href="#/box?r=' + r.id + '">' +
                    '来場を記録しました<br>資料を開く</a>';
            });
        }
    };

    // 来場者｜箱が開く
    function boxBody(r) {
        const b = state.box;
        const head = '<h3 style="color:var(--navy);margin:0">' + esc(md(state.event.date) + ' ' + state.event.title) + '</h3>';
        if (!r) return '<div class="card ng big" style="margin-top:40px">この回は対象外です</div>';
        if (!r.attended) return '<div class="card ng big" style="margin-top:40px">この回は対象外です</div>';
        if (!b.published || !b.fileName) {
            return head + '<p class="hint">来場済み</p><div class="card big">資料はまだ置かれていません</div>';
        }
        if (isExpired()) {
            return head + '<p class="hint">来場済み　期限' + expireLabel() + '</p><div class="card ng big">受け取り期限を過ぎました</div>';
        }
        return head + '<p class="hint">来場済み　期限' + expireLabel() + '</p>' +
            '<div class="card big" style="margin:16px 0">' + esc(b.fileName) + '</div>' +
            '<button type="button" class="btn block open-btn" data-id="' + r.id + '">開く</button>' +
            '<p class="caption hint" style="margin-top:8px">' + (r.opened ? '開封済み' : '') + '</p>';
    }

    routes.box = {
        nav: '来場者｜箱が開く',
        note: '来場フラグがある予約IDだけ。ログインなし。',
        render: function (q) {
            const r = findReservation(q.r || ME);
            const absent = findReservation(ABSENT);
            return title('来場者', '箱が開く') +
                '<div class="cols cols-3">' +
                frame('ブラウザ（アプリなし）<span class="hint" style="font-weight:normal">　予約#' + (r ? r.id : '-') + '</span>', boxBody(r)) +
                frame('欠席者の同じリンク<span class="hint" style="font-weight:normal">　予約#' + ABSENT + '</span>', boxBody(absent)) +
                talk('<p>欠席者に開かない。</p>' +
                    '<p>一斉添付をやめた理由が、相手に見える。</p>' +
                    '<p>請求する相手（事務局）には「誤送信と未達が止まる」と訳す。</p>', 'WOWはここ', true) +
                '</div>' +
                (r && !r.attended ? '<p class="hint">予約#' + r.id + ' はまだ来場していません。<a href="#/entrance">入場で読む</a> か <a href="#/exit">出口の掲示</a> で「来た」を付けると開きます。</p>' : '');
        },
        mount: function () {
            document.querySelectorAll('.open-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    const r = findReservation(btn.dataset.id);
                    r.opened = true;
                    saveState();
                    openFile();
                    render();
                });
            });
        }
    };

    function openFile() {
        const b = state.box;
        if (b.fileData) {
            // dataURL を Blob にして新しいタブで開く
            fetch(b.fileData).then(function (res) { return res.blob(); }).then(function (blob) {
                window.open(URL.createObjectURL(blob), '_blank');
            });
        } else {
            alert('（モック）' + b.fileName + ' を開きました。\n主催画面で2MB以下のファイルを置くと、実際に中身を表示します。');
        }
    }

    // 開催後｜再送しても添付しない
    routes['mail-after'] = {
        nav: '開催後｜メール',
        note: '添付なし。リンク先が箱。来ていなければ開かない。',
        render: function () {
            const mail =
                '<div class="mail">' +
                '<div class="subject">件名：本日の資料について</div>' +
                '<p>本日ご来場の方へ</p>' +
                '<p>資料はこちらのリンクから受け取れます。<br>添付ファイルはありません。</p>' +
                '<p>来場されていない予約の方は、リンクを開いても表示されません。</p>' +
                '<p class="url"><a href="#/box?r=' + ME + '">' + esc(boxUrl(ME)) + '</a></p>' +
                '<p class="hint">欠席者が同じ文面のリンクを開いた場合：<a href="#/box?r=' + ABSENT + '">' + esc(boxUrl(ABSENT)) + '</a></p>' +
                '</div>';
            return title('開催後', '再送しても添付しない') +
                '<div class="cols cols-2">' + frame('メール', mail) +
                talk('<p>スタッフはファイルを送らない。箱の案内だけする。</p>' +
                    '<p>開封は開催単位で残る。誰に渡したかの事後確認はここ。</p>', '個人LINEに置かない') +
                '</div>';
        }
    };

    // 主催｜開催が終わったあと
    routes.dashboard = {
        nav: '主催｜開催後の数字',
        note: '分析ダッシュボードは作らない。この3つだけ。',
        render: function () {
            const c = counts();
            const body =
                '<div class="stats">' +
                '<div class="stat"><div class="label">予約</div><div class="num">' + c.total + '</div></div>' +
                '<div class="stat"><div class="label">来場</div><div class="num">' + c.attended + '</div></div>' +
                '<div class="stat"><div class="label">開封</div><div class="num">' + c.opened + '</div></div>' +
                '</div>' +
                '<p>名簿のダウンロードは予約本体。NowOnは来場と開封だけ持つ。</p>' +
                '<p>欠席 ' + c.absent + ' のリンクは開かない。開封ログは残る。</p>' +
                '<details><summary class="hint">開封ログ（開催単位）</summary><ul class="list">' +
                state.reservations.slice().sort(function (a, b) { return a.id - b.id; }).map(function (r) {
                    return '<li><span>予約#' + r.id + '</span><span>' +
                        '<span class="tag' + (r.attended ? ' ok' : '') + '">' + (r.attended ? '来場' : '欠席') + '</span> ' +
                        '<span class="tag' + (r.opened ? ' ok' : '') + '">' + (r.opened ? '開封' : '未開封') + '</span></span></li>';
                }).join('') + '</ul></details>';
            return title('主催', '開催が終わったあと') +
                frame('NowOn　' + esc(md(state.event.date) + ' ' + state.event.title), body, true);
        }
    };

    // ---------- ルーター ----------

    const navOrder = ['', 'organizer', 'mail-confirm', 'entrance', 'exit', 'box', 'mail-after', 'dashboard'];

    function parseHash() {
        const h = location.hash.replace(/^#\/?/, '');
        const parts = h.split('?');
        const q = {};
        (parts[1] || '').split('&').forEach(function (kv) {
            if (!kv) return;
            const p = kv.split('=');
            q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
        });
        return { path: parts[0], q: q };
    }

    function render() {
        const loc = parseHash();
        const route = routes[loc.path] || routes[''];
        const path = routes[loc.path] ? loc.path : '';
        document.getElementById('demoNav').innerHTML = navOrder.map(function (key) {
            return '<a href="#/' + key + '"' + (key === path ? ' class="active"' : '') + '>' + routes[key].nav + '</a>';
        }).join('');
        document.getElementById('app').innerHTML = route.render(loc.q);
        document.getElementById('footnote').textContent = route.note || '';
        if (route.mount) route.mount(loc.q);
    }

    document.getElementById('resetBtn').addEventListener('click', function () {
        if (!confirm('デモ状態を初期化しますか？（置いたファイル・来場・開封がリセットされます）')) return;
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
        state = seedState();
        location.hash = '#/';
        render();
    });

    window.addEventListener('hashchange', render);
    render();
})();
