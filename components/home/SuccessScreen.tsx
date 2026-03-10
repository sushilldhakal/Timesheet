"use client"

import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SuccessScreenProps {
  onReset: () => void
}

export function SuccessScreen({ onReset }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/20">
        <CheckCircle2 className="h-16 w-16 text-emerald-400" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-3xl font-bold text-white">Home Page success</h2>
        <p className="text-center text-white/80">
          Your PIN has been successfully verified.
        </p>
      </div>
      <Button
        onClick={onReset}
        variant="outline"
        className="mt-4 w-full max-w-[200px] rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10"
      >
        Try Again
      </Button>
    </div>
  )
}
