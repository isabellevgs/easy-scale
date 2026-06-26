# EasyScale

App de escalas de equipe — cadastro de pessoas, turnos configuráveis, regras de recorrência, necessidade de pessoas por turno, feriados, regras de consistência e visualização por semana e mês. Tudo salvo localmente no navegador (`localStorage`), funciona offline, com exportação da escala como imagem (PNG) ou PDF e backup completo em JSON.

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
npm run preview   # opcional: servir a pasta dist/ localmente
```

Gera a pasta `dist/` com os arquivos estáticos finais. Você pode subir essa pasta em qualquer serviço de hospedagem estática (Vercel, Netlify, GitHub Pages, etc.).

## Páginas

| Rota | Página |
|------|--------|
| `/` | Início — resumo do dia, atalhos e inconsistências |
| `/equipe` | Equipe — cadastro de pessoas |
| `/escalas` | Escalas — regras de recorrência por pessoa |
| `/semana` | Escala da semana — grade semanal com staffing |
| `/mes` | Escala do mês — calendário mensal |
| `/carga-horaria` | Carga horária — horas por pessoa no mês |
| `/configuracoes` | Ajustes — turnos, necessidade, feriados e backup |

## Funcionalidades

### Equipe

- Cadastrar, editar e remover pessoas.
- Nome, cargo (opcional), cor e intervalo de descanso (minutos descontados da jornada na carga horária).

### Turnos (Ajustes)

- Turnos totalmente configuráveis: nome, horário de início/fim, dias da semana e se se aplicam em feriados.
- Turno padrão ao instalar: **Turno 1**, das 08:00 às 18:00, segunda a sexta, sem feriados.
- É possível adicionar, editar, excluir e restaurar os turnos padrão.

### Escalas

Regras de recorrência por pessoa, com:

- **Tipo de escala**: regular, plantão ou hora extra.
- **Tipo de recorrência**:
  - Dia específico
  - Seleção de dias (calendário)
  - Semanal (dias da semana + início/fim opcionais)
  - Personalizada (intervalo, frequência, término)
- Um ou mais turnos por regra.
- Data de início e fim (opcional, conforme o tipo).

Plantão e hora extra podem coexistir com escala regular no mesmo dia; cada pessoa só pode ter uma escala **regular** por dia.

### Semana e Mês

- Grade/calendário com pessoas escaladas por turno.
- Indicador de necessidade de pessoas (verde/amarelo/vermelho) conforme a meta definida em Ajustes.
- Clique em um turno/dia para abrir o modal de staffing: adicionar ou remover pessoas naquele dia.
- Ao remover alguém já escalado, escolha: excluir só aquele dia, todos os futuros, toda a escala ou cancelar.
- Recorrência configurável por pessoa direto no modal (ícone de repetir).
- Filtro por pessoa e exportação da visão atual em PNG ou PDF.
- Detecção de inconsistências com base nas regras de consistência.

### Carga horária

- Resumo mensal de horas por pessoa, com desconto do intervalo configurado na equipe.

### Ajustes

- **Necessidade por turno**: quantas pessoas são necessárias em cada turno, por dia da semana e feriados.
- **Feriados**: cadastro de datas que afetam turnos e escalas semanais.
- **Regras de consistência**: vínculos de pessoas a metas (ex.: trabalhar X turnos na semana, dias de folga).
- **Backup**: exportar/importar JSON com todos os dados do dispositivo.

## Dados e backup

Todos os dados ficam no `localStorage` do navegador (`easyscale:v1`). Não há backend, conta ou sincronização automática entre dispositivos.

O backup exporta um arquivo `easyscale-backup-AAAA-MM-DD.json` com:

- Equipe (`people`)
- Escalas (`rules`)
- Turnos (`shifts`)
- Necessidade por turno (`shiftNeeds`)
- Feriados (`holidays`)
- Regras de consistência (`consistencyRules`)

Importar um backup substitui todos os dados atuais no dispositivo. Backups antigos (formato legado com `shiftTimes` ou turnos Manhã/Tarde/Noite) continuam compatíveis.

## Estrutura do projeto

```
src/
  components/       # UI reutilizável (modal, badges, modais de escala/staffing, etc.)
  pages/            # Páginas da aplicação
  lib/
    schedule.js     # Motor de recorrência (expande regras em ocorrências por data)
    scheduleToggle.js  # Adicionar/remover pessoas em dias específicos
    shifts.js       # Turnos configuráveis e padrões
    shiftNeeds.js   # Necessidade de pessoas por turno/dia
    rules.js        # Tipos de escala e normalização de regras
    consistencyRules.js  # Regras de consistência e detecção de inconsistências
    workload.js     # Cálculo de carga horária
    backup.js       # Exportação/importação de backup JSON
    storage.js      # Persistência em localStorage
    export.js       # Exportação de PNG/PDF
    customRecurrence.js  # Recorrência personalizada
  hooks/
    useAppData.js   # Estado central da aplicação
  context/          # Providers (turnos, shell)
```

## Stack

- React 19 + Vite 8
- React Router 7
- Tailwind CSS 4
- date-fns
- html2canvas-pro + jsPDF (exportação)
- lucide-react (ícones)
