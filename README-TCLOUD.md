# TCloud Web

Foundation 1 da interface web do TCloud.

## Stack

- Next.js App Router
- TypeScript
- Lucide icons
- TCloud Design System 1.0
- proxy server-side para o TCloud Core

## Rodar

Primeiro:
  cd D:\TCloud\core
  cargo run

Depois:
  cd D:\TCloud\web
  npm run dev

Abra:
  http://localhost:3000

Ou execute:
  D:\TCloud\run-web-core-dev.ps1

## Nesta fase

- interface unificada
- sidebar
- busca
- grade/lista
- estados de sincronizacao
- leitura do status do Core
- leitura de arquivos de demonstracao

Os botoes de mutacao ainda estao desativados de proposito.
Eles serao ligados quando o Core tiver banco, autenticacao e Telegram.