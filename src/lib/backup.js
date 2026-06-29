import { format } from "date-fns";
import { buildShiftsById } from "./shifts";
import { normalizeState } from "./storage";
import {
  buildConsistencyRulesForBackup,
  countConsistencyRuleLinks,
  countConsistencyRulesWithPeople,
} from "./consistencyRules";
import { countTimeCoverageRules } from "./timeCoverageRules";
import { isRegularScaleType } from "./rules";

export const BACKUP_VERSION = 2;

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildBackupData(state) {
  const data = normalizeState(state);
  const shiftsById = buildShiftsById(data.shifts);

  return {
    ...data,
    consistencyRules: buildConsistencyRulesForBackup(data.people, data.consistencyRules, shiftsById),
  };
}

export function createBackupPayload(state) {
  const data = buildBackupData(state);

  return {
    easyscale: true,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    features: [
      "people.intervalMinutes",
      "rules.scaleType",
      "rules.intervalStart",
      "rules.intervalEnd",
      "shifts",
      "shiftNeeds",
      "holidays",
      "consistencyRules",
      "timeCoverageRules",
      "showTimeCoverageViolations",
      "substitutions",
      "substitutions.intervalStart",
      "substitutions.intervalEnd",
    ],
    data,
  };
}

export function backupFilename(date = new Date()) {
  return `easyscale-backup-${format(date, "yyyy-MM-dd")}.json`;
}

export function downloadBackup(state) {
  const payload = createBackupPayload(state);
  const filename = backupFilename();
  downloadJson(filename, payload);
  return { ok: true, filename, payload };
}

function extractBackupData(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Arquivo inválido.");
  }

  if (parsed.easyscale === true && parsed.data) {
    if (typeof parsed.version === "number" && parsed.version > BACKUP_VERSION) {
      throw new Error("Este backup foi criado em uma versão mais recente do EasyScale.");
    }
    return normalizeState(parsed.data);
  }

  if (Array.isArray(parsed.people) || Array.isArray(parsed.rules) || parsed.shifts || parsed.shiftTimes) {
    return normalizeState(parsed);
  }

  throw new Error("Arquivo não reconhecido como backup do EasyScale.");
}

export async function readBackupFile(file) {
  if (!file) {
    throw new Error("Nenhum arquivo selecionado.");
  }

  const text = await file.text();
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }

  return extractBackupData(parsed);
}

export function describeBackupContents(state) {
  const data = normalizeState(state);
  const rulesWithInterval = data.rules.filter(
    (rule) =>
      isRegularScaleType(rule.scaleType) &&
      typeof rule.intervalStart === "string" &&
      rule.intervalStart &&
      typeof rule.intervalEnd === "string" &&
      rule.intervalEnd
  ).length;

  return {
    people: data.people.length,
    rules: data.rules.length,
    rulesWithInterval,
    shifts: data.shifts.length,
    holidays: data.holidays.length,
    includesShiftNeeds: Array.isArray(data.shiftNeeds) && data.shiftNeeds.length > 0,
    consistencyRulesWithPeople: countConsistencyRulesWithPeople(data.consistencyRules),
    consistencyRuleLinks: countConsistencyRuleLinks(data.consistencyRules),
    timeCoverageRules: countTimeCoverageRules(data.timeCoverageRules),
    substitutions: Array.isArray(data.substitutions) ? data.substitutions.length : 0,
  };
}
