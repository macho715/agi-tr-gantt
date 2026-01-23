import { DashboardHeader } from "@/components/dashboard/header"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { OperationalNotice, WeatherAlert } from "@/components/dashboard/alerts"
import { VoyageCards } from "@/components/dashboard/voyage-cards"
import { ScheduleTable } from "@/components/dashboard/schedule-table"
import { GanttChart } from "@/components/dashboard/gantt-chart"
import { Footer } from "@/components/dashboard/footer"

export default function Page() {
  return (
    <div className="relative z-10 max-w-[1800px] mx-auto p-6">
      <DashboardHeader />
      <OperationalNotice />
      <KPICards />
      <WeatherAlert />
      <VoyageCards />
      <ScheduleTable />
      <GanttChart />
      <Footer />
    </div>
  )
}
