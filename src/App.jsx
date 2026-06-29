import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell";
import { ToastProvider } from "./components/Toast";
import HomePage from "./pages/HomePage";
import TeamPage from "./pages/TeamPage";
import SchedulesPage from "./pages/SchedulesPage";
import WeekPage from "./pages/WeekPage";
import MonthPage from "./pages/MonthPage";
import WorkloadSummaryPage from "./pages/WorkloadSummaryPage";
import SettingsPage from "./pages/SettingsPage";
import { ShiftsProvider } from "./context/ShiftsProvider";
import { useAppData } from "./hooks/useAppData";

export default function App() {
  const data = useAppData();

  return (
    <ToastProvider>
      <BrowserRouter>
        <ShiftsProvider shifts={data.shifts}>
          <AppShell exportBackup={data.exportBackup} importBackup={data.importBackup}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  people={data.people}
                  rules={data.rules}
                  holidays={data.holidays}
                  consistencyRules={data.consistencyRules}
                  onSaveConsistencyRules={data.updateConsistencyRules}
                />
              }
            />
            <Route
              path="/equipe"
              element={
                <TeamPage
                  people={data.people}
                  rules={data.rules}
                  addPerson={data.addPerson}
                  updatePerson={data.updatePerson}
                  removePerson={data.removePerson}
                />
              }
            />
            <Route
              path="/escalas"
              element={
                <SchedulesPage
                  people={data.people}
                  rules={data.rules}
                  holidays={data.holidays}
                  addRule={data.addRule}
                  updateRule={data.updateRule}
                  removeRule={data.removeRule}
                  substitutions={data.substitutions}
                  removeSubstitution={data.removeSubstitution}
                />
              }
            />
            <Route
              path="/semana"
              element={
                <WeekPage
                  people={data.people}
                  rules={data.rules}
                  shiftNeeds={data.shiftNeeds}
                  holidays={data.holidays}
                  consistencyRules={data.consistencyRules}
                  onSaveConsistencyRules={data.updateConsistencyRules}
                  timeCoverageRules={data.timeCoverageRules}
                  showTimeCoverageViolations={data.showTimeCoverageViolations}
                  onSaveTimeCoverageRules={data.updateTimeCoverageRules}
                  addRule={data.addRule}
                  updateRule={data.updateRule}
                  removeRule={data.removeRule}
                  substitutions={data.substitutions}
                  substitutePersonOnShiftDate={data.substitutePersonOnShiftDate}
                  removeSubstitution={data.removeSubstitution}
                />
              }
            />
            <Route
              path="/mes"
              element={
                <MonthPage
                  people={data.people}
                  rules={data.rules}
                  shiftNeeds={data.shiftNeeds}
                  holidays={data.holidays}
                  consistencyRules={data.consistencyRules}
                  onSaveConsistencyRules={data.updateConsistencyRules}
                  addRule={data.addRule}
                  updateRule={data.updateRule}
                  removeRule={data.removeRule}
                  substitutions={data.substitutions}
                  substitutePersonOnShiftDate={data.substitutePersonOnShiftDate}
                  removeSubstitution={data.removeSubstitution}
                />
              }
            />
            <Route
              path="/carga-horaria"
              element={
                <WorkloadSummaryPage
                  people={data.people}
                  rules={data.rules}
                  holidays={data.holidays}
                />
              }
            />
            <Route
              path="/configuracoes"
              element={
                <SettingsPage
                  people={data.people}
                  rules={data.rules}
                  shifts={data.shifts}
                  shiftNeeds={data.shiftNeeds}
                  holidays={data.holidays}
                  consistencyRules={data.consistencyRules}
                  timeCoverageRules={data.timeCoverageRules}
                  addShift={data.addShift}
                  updateShift={data.updateShift}
                  removeShift={data.removeShift}
                  resetShifts={data.resetShifts}
                  isDefaultShifts={data.isDefaultShifts}
                  updateShiftNeeds={data.updateShiftNeeds}
                  resetShiftNeeds={data.resetShiftNeeds}
                  addHoliday={data.addHoliday}
                  removeHoliday={data.removeHoliday}
                  exportBackup={data.exportBackup}
                  importBackup={data.importBackup}
                  substitutions={data.substitutions}
                />
              }
            />
          </Routes>
        </AppShell>
      </ShiftsProvider>
    </BrowserRouter>
    </ToastProvider>
  );
}
