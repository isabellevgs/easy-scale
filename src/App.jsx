import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import TeamPage from "./pages/TeamPage";
import SchedulesPage from "./pages/SchedulesPage";
import WeekPage from "./pages/WeekPage";
import MonthPage from "./pages/MonthPage";
import SettingsPage from "./pages/SettingsPage";
import { ShiftsProvider } from "./context/ShiftsContext";
import { useAppData } from "./hooks/useAppData";

export default function App() {
  const data = useAppData();

  return (
    <BrowserRouter>
      <ShiftsProvider shiftTimes={data.shiftTimes}>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage people={data.people} rules={data.rules} holidays={data.holidays} />} />
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
                  addRule={data.addRule}
                  updateRule={data.updateRule}
                  removeRule={data.removeRule}
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
                  addRule={data.addRule}
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
                  addRule={data.addRule}
                />
              }
            />
            <Route
              path="/configuracoes"
              element={
                <SettingsPage
                  people={data.people}
                  rules={data.rules}
                  shiftTimes={data.shiftTimes}
                  shiftNeeds={data.shiftNeeds}
                  holidays={data.holidays}
                  updateShiftTimes={data.updateShiftTimes}
                  resetShiftTimes={data.resetShiftTimes}
                  updateShiftNeeds={data.updateShiftNeeds}
                  resetShiftNeeds={data.resetShiftNeeds}
                  addHoliday={data.addHoliday}
                  removeHoliday={data.removeHoliday}
                  exportBackup={data.exportBackup}
                  importBackup={data.importBackup}
                />
              }
            />
          </Routes>
        </AppShell>
      </ShiftsProvider>
    </BrowserRouter>
  );
}
