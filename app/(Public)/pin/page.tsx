import { DeviceGuard } from "@/components/device/device-guard"
import { Home } from "@/components/Home"

export default function Page() {
  return (
    <DeviceGuard>
      <Home />
    </DeviceGuard>
  )
}