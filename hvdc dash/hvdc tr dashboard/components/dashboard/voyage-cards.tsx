import { Ship, Sailboat } from "lucide-react"
import { voyages } from "@/lib/dashboard-data"

export function VoyageCards() {
  return (
    <section className="bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15 mb-6">
      <h2 className="text-foreground text-base font-bold mb-5 flex items-center gap-2 tracking-tight">
        <Ship className="w-5 h-5 text-cyan-400" />
        7 Voyages Overview
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent ml-3" />
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {voyages.map((v) => (
          <div
            key={v.voyage}
            className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl p-4 border border-accent/15 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-cyan-500 hover:shadow-voyage"
          >
            <div className="font-mono text-amber-400 text-[10px] font-bold tracking-widest uppercase mb-2">
              Voyage {v.voyage}
            </div>
            <div className="text-foreground text-sm font-bold mb-3 tracking-tight">
              {v.trUnit}
            </div>
            <div className="font-mono text-[10px] text-slate-500 leading-relaxed space-y-0.5">
              <p>
                <strong className="text-slate-400">Load-out:</strong> {v.loadOut}
              </p>
              <p>
                <strong className="text-slate-400">Load-in:</strong> {v.loadIn}
              </p>
              <p>
                <strong className="text-slate-400">Jack-down:</strong> {v.jackDown}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 px-3 py-1.5 rounded-full font-mono text-[10px] font-bold tracking-wide">
              <Sailboat className="w-3 h-3" />
              {v.sailDate}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
