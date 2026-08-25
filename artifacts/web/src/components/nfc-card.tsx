import { Wifi } from "lucide-react";

export function NfcCard({
  title,
  value,
  id,
}: {
  title: string;
  value: string;
  id: string;
}) {
  return (
    <div className="w-full h-48 bg-gradient-to-br from-[#0f4c35] via-[#1a6b4a] to-[#0a3526] rounded-2xl p-5 relative overflow-hidden mb-5 shadow-lg select-none">
      {/* Decorative amber circle */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#f0a500]/10 rounded-full" />

      {/* Chip */}
      <div className="w-9 h-7 bg-[#f0a500] rounded-md mb-4 relative z-10 shadow-sm border border-black/10">
        <div className="absolute inset-[3px] border border-black/15 rounded-sm" />
      </div>

      <div className="text-white/70 text-xs tracking-wider mb-1 relative z-10 uppercase">
        {title}
      </div>
      <div className="text-white text-3xl font-semibold relative z-10 tracking-tight flex items-baseline gap-1">
        {value}
      </div>

      <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end z-10">
        <div className="text-white/45 text-[11px] tracking-[3px] font-mono">
          {id}
        </div>
      </div>

      {/* NFC Pulsing Ring Motif */}
      <div className="absolute right-5 bottom-5 w-12 h-12">
        <Wifi className="text-[#f0a500] size-7 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rotate-90" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-[1.5px] border-[#f0a500]/40 animate-ping duration-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-[#f0a500]/20 animate-ping delay-500 duration-1000" />
      </div>
    </div>
  );
}
