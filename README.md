# EasyScale

App de escalas de equipe — cadastro de time, regras de recorrência (dia específico, semanal, mensal ou meses específicos), turnos múltiplos por pessoa (manhã/tarde/noite) e visualização por semana e mês. Tudo salvo localmente no navegador (`localStorage`), funciona offline, com exportação da escala como imagem (PNG) ou PDF.

## Como rodar

Requer [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

```bash
cd easyscale
npm install
npm run dev
```

Abra o endereço mostrado no terminal (geralmente `http://localhost:5173`).

## Build de produção

```bash
npm run build
```

Gera a pasta `dist/` com os arquivos estáticos finais. Você pode subir essa pasta em qualquer serviço de hospedagem estática (Vercel, Netlify, GitHub Pages, ou até um servidor próprio) ou simplesmente abrir localmente.

## Estrutura do projeto

```
src/
  components/     # Componentes de UI reutilizáveis (botões, modal, badges, etc.)
  pages/          # Páginas: Início, Equipe, Escalas, Semana, Mês
  lib/
    schedule.js   # Motor de recorrência (expande regras em ocorrências por data)
    storage.js    # Persistência em localStorage
    export.js     # Exportação para PNG/PDF
    constants.js  # Turnos, cores, labels de dias/meses
  hooks/
    useAppData.js # Estado central (pessoas + regras de escala)
```

## Funcionalidades

- **Equipe**: cadastrar, editar e remover pessoas.
- **Escalas**: criar regras de recorrência por pessoa, com:
  - Dia específico
  - Semanal (escolha os dias da semana)
  - Mensal (todo dia X do mês)
  - Meses específicos (com ou sem dia fixo)
  - Seleção de um ou mais turnos (manhã, tarde, noite) por regra
  - Data de início e fim (opcional)
- **Semana**: visão dos 7 dias com os turnos e pessoas escaladas.
- **Mês**: calendário completo com indicadores de turno por dia; clique em um dia para ver detalhes.
- **Compartilhar**: nas visões de Semana e Mês, baixe a escala atual como imagem (PNG) ou PDF.

## Dados

Todos os dados (equipe e escalas) ficam salvos no `localStorage` do navegador, no dispositivo onde o app é usado. Limpar os dados do navegador (ou usar em modo anônimo) apaga as informações. Não há backend, conta ou sincronização entre dispositivos.
