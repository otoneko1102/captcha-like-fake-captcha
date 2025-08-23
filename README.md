# Captcha Like Fake Captcha

ReCAPTCHAに扮した偽ReCAPTCHA風のCaptchaのサンプルです。  
HTML Applicationとmshtaコマンドを使用しているので、アクセスするユーザーがWindows以外ではおそらく動作しません。  
このプロジェクトを配置するOSはLinuxなど、Windows以外でも問題ありません。  
mshtaコマンドがWindowsセキュリティ(Windows Defender)にブロックされることがあるので、アクセスするユーザーはスキャン対象から `C:\Windows\System32\mshta.exe` を除外してください。  
それでも実行時にセキュリティ保護がかかる場合は、許可された脅威を参照して適宜許可してください。

> 将来的にmshtaコマンドが動作しなくなる可能性があります。

## Disclaimer

このプロジェクト(以下、プロジェクト)は実験目的で作成されました。利用や運用を推奨するものではありません。自己責任でお願いします。  
プロジェクトを利用・運用して発生した損害や予期せぬ事態について、プロジェクト作成者は一切の責任を負いません。

## Setup

```bash
npm run build
npm run start
```

## Test

https://hta.oto.im/

