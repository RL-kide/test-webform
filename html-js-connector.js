// HTMLフォームのscriptタグ内に追加するJavaScriptコード
// Google Apps Scriptへのフォーム送信を処理します

document.getElementById('assessmentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 送信ボタンを無効化して二重送信を防止
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = '送信中...';
    
    // 成功・エラーメッセージ要素
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    
    // フォームデータの収集
    const formData = new FormData(this);
    const jsonData = {};
    
    // FormDataオブジェクトからJSONデータを作成
    for (let [key, value] of formData.entries()) {
        jsonData[key] = value;
    }
    
    // Google Apps ScriptのウェブアプリURL
    // 実際のデプロイ後のURLに置き換える必要があります
    const scriptURL = 'https://script.google.com/a/macros/reservelink.co.jp/s/AKfycbyNmcUAPRL1O8a32ohg9-Vr0BFxWJR4IuHPNiEM1BjyN4NOlBrmeXRNfPWPvhbau_amUQ/exec';
    
    // JSONデータをGASに送信
    fetch(scriptURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('サーバーエラーが発生しました');
        }
        return response.json();
    })
    .then(data => {
        // 送信成功時の処理
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // ページ最上部までスクロール
        window.scrollTo(0, 0);
        
        // フォームのリセット
        document.getElementById('assessmentForm').reset();
        
        // 5秒後に成功メッセージを非表示
        setTimeout(function() {
            successMessage.style.display = 'none';
        }, 5000);
    })
    .catch(error => {
        // エラー時の処理
        errorMessage.textContent = `エラー: ${error.message}`;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        // ページ最上部までスクロール
        window.scrollTo(0, 0);
    })
    .finally(() => {
        // 送信ボタンを再度有効化
        submitBtn.disabled = false;
        submitBtn.innerText = '評価を送信する';
    });
});

// フォームの入力値をローカルストレージに一時保存する機能（オプション）
// 入力途中で誤ってページを離れても入力内容が失われないようにする

// 入力値の保存（入力フィールドが変更されるたびに実行）
function saveFormData() {
    const formData = new FormData(document.getElementById('assessmentForm'));
    const dataObject = {};
    
    for (let [key, value] of formData.entries()) {
        dataObject[key] = value;
    }
    
    localStorage.setItem('assessmentFormData', JSON.stringify(dataObject));
}

// 保存されたデータの読み込み（ページ読み込み時に実行）
function loadFormData() {
    const savedData = localStorage.getItem('assessmentFormData');
    
    if (savedData) {
        const dataObject = JSON.parse(savedData);
        const form = document.getElementById('assessmentForm');
        
        // 各フィールドにデータを設定
        for (const key in dataObject) {
            const field = form.elements[key];
            
            if (field) {
                if (field.type === 'radio') {
                    // ラジオボタンの場合
                    const radios = form.querySelectorAll(`input[name="${key}"]`);
                    radios.forEach(radio => {
                        if (radio.value === dataObject[key]) {
                            radio.checked = true;
                        }
                    });
                } else {
                    // その他のフィールド（テキスト、テキストエリア、日付など）
                    field.value = dataObject[key];
                }
            }
        }
    }
}

// ページ読み込み完了時に保存データを読み込む
document.addEventListener('DOMContentLoaded', function() {
    loadFormData();
    
    // すべての入力フィールドに変更イベントリスナーを追加
    const form = document.getElementById('assessmentForm');
    const fields = form.querySelectorAll('input, textarea, select');
    
    fields.forEach(field => {
        field.addEventListener('change', saveFormData);
    });
});

// フォーム送信成功後にローカルストレージのデータを削除
function clearSavedFormData() {
    localStorage.removeItem('assessmentFormData');
}
