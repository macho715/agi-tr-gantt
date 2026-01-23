import { Megaphone, AlertTriangle } from "lucide-react"

export function OperationalNotice() {
  return (
    <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/5 border border-cyan-500/40 rounded-xl px-6 py-4 mb-6 flex items-start gap-4">
      <Megaphone className="w-7 h-7 text-cyan-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="text-slate-300">
          <strong className="text-cyan-400">AGI TR Units 1-7</strong> — Beam change |
          LO/LI | Sea fastening | Transportation | Turning | Jacking-down
        </p>
        <div className="text-slate-400 text-xs mt-2 space-y-0.5">
          <p>• 1st Trip: Load 1 TR Unit (without LCT ballasting)</p>
          <p>• SPMT: 2 Sets maintained | MOB: 26 Jan (No change)</p>
          <p className="italic">• Remaining schedule to be confirmed</p>
        </div>
      </div>
    </div>
  )
}

export function WeatherAlert() {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-amber-400/5 border border-amber-500/35 rounded-xl px-6 py-5 mb-6 flex items-start gap-4">
      <AlertTriangle className="w-7 h-7 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="text-amber-400 text-sm font-bold mb-2 tracking-tight">
          Weather & Marine Risk Update (Mina Zayed Port)
        </h4>
        <p className="text-slate-500 text-[10px] mb-2">
          Last Updated: 21 Jan 2026 | Update Frequency: Weekly
        </p>
        <div className="text-slate-400 text-xs leading-relaxed space-y-2">
          <p>
            <strong className="text-amber-300">21–22 Jan:</strong> High operational risk
            due to NW winds and potential dust (reduced visibility); sea state may reach
            rough to very rough.
          </p>
          <p>
            <strong className="text-amber-300">23–30 Jan:</strong> Conditions generally
            ease, improving the working window—MZP Arrival (26 Jan) may peak around 20.00
            kt, while Deck Prep (27–28 Jan) and Load-out (29–30 Jan) are mostly ≤12.00 kt.
          </p>
        </div>
      </div>
    </div>
  )
}
